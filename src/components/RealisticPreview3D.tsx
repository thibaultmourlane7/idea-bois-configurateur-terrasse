import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { LayoutResult, ProjectInput, SupportPlanResult } from '../domain/types';
import { findBoard } from '../catalog/compatibility';
import { buildProfessional3DScene, type Scene3DPoint } from '../engine/scene3d';
import { computeImmersiveCameraFrame } from '../visual/immersive3d';
import type { ConstructionLayers } from '../visual/layers';
import { resolveMaterialProfile } from '../visual/materialProfiles';

function point3(point: Scene3DPoint, yOffset = 0): THREE.Vector3 {
  return new THREE.Vector3(point.xM, point.zM + yOffset, point.yM);
}

function cssColor(value: string, fallback: string): THREE.Color {
  try {
    return new THREE.Color(value || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

function canvasTexture(baseColor: string, grainColor: string, boardId: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  ctx.fillStyle = baseColor || '#b88758';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grain = cssColor(grainColor, '#755234');
  const r = Math.round(grain.r * 255);
  const g = Math.round(grain.g * 255);
  const b = Math.round(grain.b * 255);

  for (let row = 0; row < 32; row += 1) {
    const seed = Math.sin((row + 1) * 12.9898 + boardId.length * 78.233) * 43758.5453;
    const offset = (seed - Math.floor(seed)) * 18;
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.045 + (row % 5) * .012})`;
    ctx.lineWidth = .7 + (row % 3) * .35;
    ctx.beginPath();
    for (let x = -20; x <= canvas.width + 20; x += 12) {
      const y = (row + .5) * (canvas.height / 32)
        + Math.sin(x * .035 + row * .8) * (1.2 + (row % 4) * .45)
        + offset * .08;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const profile = resolveMaterialProfile(findBoard(boardId) ?? ({ id: boardId } as ProjectInput['board']));
  if (profile?.grooveBands.length) {
    ctx.strokeStyle = 'rgba(32,25,20,.28)';
    ctx.lineWidth = 1;
    for (const band of profile.grooveBands) {
      for (let index = 0; index < band.count; index += 1) {
        const ratio = band.startRatio + (band.endRatio - band.startRatio) * ((index + .5) / band.count);
        const y = ratio * canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function prismGeometry(top: Scene3DPoint[], bottom: Scene3DPoint[]) {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;
  let indexOffset = 0;

  const face = (points: Scene3DPoint[], materialIndex: number) => {
    for (const point of points) {
      const p = point3(point);
      positions.push(p.x, p.y, p.z);
    }
    uvs.push(0, 0, 0, 1, 1, 1, 1, 0);
    indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2, vertexOffset, vertexOffset + 2, vertexOffset + 3);
    geometry.addGroup(indexOffset, 6, materialIndex);
    vertexOffset += 4;
    indexOffset += 6;
  };

  face([top[0], top[1], top[2], top[3]], 0);
  face([bottom[3], bottom[2], bottom[1], bottom[0]], 1);
  face([bottom[0], bottom[1], top[1], top[0]], 1);
  face([bottom[1], bottom[2], top[2], top[1]], 1);
  face([bottom[2], bottom[3], top[3], top[2]], 1);
  face([bottom[3], bottom[0], top[0], top[3]], 1);

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function quadGeometry(points: Scene3DPoint[]) {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  points.forEach((point) => {
    const p = point3(point);
    positions.push(p.x, p.y, p.z);
  });
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function beam(
  startPoint: Scene3DPoint,
  endPoint: Scene3DPoint,
  widthM: number,
  heightM: number,
  material: THREE.Material,
  yOffset = 0,
) {
  const start = point3(startPoint, yOffset);
  const end = point3(endPoint, yOffset);
  const direction = end.clone().sub(start);
  const length = Math.max(.001, direction.length());
  const geometry = new THREE.BoxGeometry(length, Math.max(.008, heightM), Math.max(.008, widthM));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinderBetween(
  startPoint: Scene3DPoint,
  endPoint: Scene3DPoint,
  radiusM: number,
  material: THREE.Material,
) {
  const start = point3(startPoint);
  const end = point3(endPoint);
  const direction = end.clone().sub(start);
  const length = Math.max(.001, direction.length());
  const geometry = new THREE.CylinderGeometry(Math.max(.008, radiusM), Math.max(.008, radiusM), length, 10);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function RealisticPreview3D({
  input,
  supportPlan,
  layout,
  layers,
  exploded,
  handActive,
  resetKey,
}: {
  input: ProjectInput;
  supportPlan?: SupportPlanResult;
  layout?: LayoutResult;
  layers: ConstructionLayers;
  exploded: boolean;
  handActive: boolean;
  resetKey: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef<ReturnType<typeof computeImmersiveCameraFrame> | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const sceneModel = useMemo(
    () => buildProfessional3DScene(input, layout, supportPlan),
    [input, layout, supportPlan],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setWebglError('La 3D réaliste WebGL n’est pas disponible sur cet appareil. Utilisez la vue technique.');
      return;
    }

    setWebglError(null);
    const world = new THREE.Scene();
    world.fog = new THREE.Fog(0xf4f7f5, 12, 42);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(320, host.clientWidth), Math.max(360, host.clientHeight), false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.className = 'immersive3d-canvas';
    host.replaceChildren(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      43,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      .03,
      180,
    );
    cameraRef.current = camera;

    const frame = computeImmersiveCameraFrame(sceneModel);
    frameRef.current = frame;
    camera.position.set(frame.cameraXM, frame.cameraZM, frame.cameraYM);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = .065;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = Math.max(.65, frame.radiusM * .14);
    controls.maxDistance = frame.radiusM * 4.2;
    controls.minPolarAngle = .06;
    controls.maxPolarAngle = Math.PI * .495;
    controls.target.set(frame.targetXM, frame.targetZM, frame.targetYM);
    controls.enabled = handActive;
    controls.update();

    const hemi = new THREE.HemisphereLight(0xeaf7ff, 0x7b6b50, 1.35);
    world.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff3dd, 3.1);
    sun.position.set(frame.targetXM - frame.radiusM * .75, frame.targetZM + frame.radiusM * 1.55, frame.targetYM - frame.radiusM * .6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = .1;
    sun.shadow.camera.far = frame.radiusM * 5;
    const shadowSpan = Math.max(8, frame.radiusM * 1.45);
    sun.shadow.camera.left = -shadowSpan;
    sun.shadow.camera.right = shadowSpan;
    sun.shadow.camera.top = shadowSpan;
    sun.shadow.camera.bottom = -shadowSpan;
    sun.shadow.bias = -.00012;
    world.add(sun);

    const fill = new THREE.DirectionalLight(0xbadfff, .55);
    fill.position.set(frame.targetXM + frame.radiusM, frame.targetZM + frame.radiusM * .4, frame.targetYM + frame.radiusM);
    world.add(fill);

    const groundY = sceneModel.bounds.minZM - .055;
    const groundSize = Math.max(18, frame.radiusM * 3.4);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8b99d,
      roughness: .95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(frame.targetXM, groundY, frame.targetYM);
    ground.receiveShadow = true;
    world.add(ground);

    const root = new THREE.Group();
    world.add(root);

    const boardMaterials = new Map<string, [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial]>();
    const getBoardMaterials = (boardId: string, baseColor: string, grainColor: string) => {
      const cached = boardMaterials.get(boardId);
      if (cached) return cached;
      const board = findBoard(boardId);
      const map = canvasTexture(baseColor, grainColor, boardId);
      if (map) {
        const repeatLength = Math.max(.8, (board?.lengthMm ?? 3000) / 1150);
        map.repeat.set(repeatLength, 1);
      }
      const top = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map,
        bumpMap: map,
        bumpScale: .0032,
        roughness: board?.technical.materialFamily === 'composite' ? .72 : .64,
        metalness: 0,
      });
      const side = new THREE.MeshStandardMaterial({
        color: cssColor(baseColor, '#aa7d51').multiplyScalar(.68),
        roughness: .82,
        metalness: 0,
      });
      boardMaterials.set(boardId, [top, side]);
      return [top, side] as const;
    };

    const deckOffset = exploded ? .34 : 0;
    const joistOffset = exploded ? .13 : 0;
    const supportOffset = exploded ? -.04 : 0;

    if (layers.plots) {
      const supportedMat = new THREE.MeshStandardMaterial({ color: 0x58636b, roughness: .68, metalness: .35 });
      const warningMat = new THREE.MeshStandardMaterial({ color: 0xb94e49, roughness: .7, metalness: .12 });
      for (const support of sceneModel.supports) {
        const height = Math.max(.01, support.topZM - support.bottomZM);
        const geometry = new THREE.CylinderGeometry(Math.max(.025, support.radiusM), Math.max(.032, support.radiusM * 1.08), height, 14);
        const mesh = new THREE.Mesh(geometry, support.status === 'unsupported' ? warningMat : supportedMat);
        mesh.position.set(support.xM, support.bottomZM + height / 2 + supportOffset, support.yM);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
      }
    }

    if (layers.joists) {
      const fieldMat = new THREE.MeshStandardMaterial({ color: 0x6b4a31, roughness: .88 });
      const perimeterMat = new THREE.MeshStandardMaterial({ color: 0x315d7a, roughness: .8 });
      const boundaryMat = new THREE.MeshStandardMaterial({ color: 0x2b7499, roughness: .8 });
      for (const joist of sceneModel.joists) {
        const material = joist.role === 'perimeter'
          ? perimeterMat
          : joist.role === 'zone-boundary'
            ? boundaryMat
            : fieldMat;
        root.add(beam(joist.start, joist.end, joist.widthM * Math.max(1, joist.multiplicity), joist.heightM, material, joistOffset));
      }
    }

    if (layers.edgeCladding) {
      for (const edge of sceneModel.edges) {
        if (edge.treatment === 'none' || edge.curved) continue;
        const color = edge.treatment === 'cladding' ? 0x9b7351
          : edge.treatment === 'profile' ? 0x72518b
            : edge.treatment === 'drainage' ? 0x2f7f77
              : 0x765134;
        const material = new THREE.MeshStandardMaterial({ color, roughness: .73, side: THREE.DoubleSide });
        const bottomA = { ...edge.start, zM: edge.start.zM - edge.heightM };
        const bottomB = { ...edge.end, zM: edge.end.zM - edge.heightM };
        const geometry = quadGeometry([bottomA, bottomB, edge.end, edge.start]);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y += deckOffset;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
      }
    }

    if (layers.decking) {
      for (const board of sceneModel.boards) {
        const materials = getBoardMaterials(board.boardId, board.baseColor, board.grainColor);
        const geometry = prismGeometry(board.top, board.bottom);
        const mesh = new THREE.Mesh(geometry, materials);
        mesh.position.y += deckOffset;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
      }

      for (const stair of sceneModel.stairs) {
        const stairBoard = findBoard(stair.boardId) ?? input.board;
        const topColor = stairBoard.visual?.baseColor ?? '#b8895d';
        const grain = stairBoard.visual?.grainColor ?? '#725034';
        const materials = getBoardMaterials(stairBoard.id, topColor, grain);
        const thicknessM = stairBoard.thicknessMm / 1000;
        for (const tread of stair.treads) {
          const bottom = tread.top.map((point) => ({ ...point, zM: point.zM - thicknessM }));
          const geometry = prismGeometry(tread.top, bottom);
          const mesh = new THREE.Mesh(geometry, materials);
          mesh.position.y += deckOffset;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          root.add(mesh);
        }
      }
    }

    if (layers.joists) {
      const stairStructureMat = new THREE.MeshStandardMaterial({ color: 0x65472f, roughness: .88 });
      for (const stair of sceneModel.stairs) {
        for (const axis of stair.structureAxes) {
          root.add(beam(axis.start, axis.end, .065, .09, stairStructureMat, joistOffset));
        }
      }
    }

    if (layers.edgeCladding) {
      const postMat = new THREE.MeshStandardMaterial({ color: 0x425967, roughness: .48, metalness: .48 });
      const railMat = new THREE.MeshStandardMaterial({ color: 0x304b5c, roughness: .4, metalness: .55 });
      for (const guardrail of sceneModel.guardrails) {
        for (const post of guardrail.posts) {
          const height = Math.max(.02, post.top.zM - post.base.zM);
          const width = Math.max(.035, (guardrail.postSectionWidthMm ?? 45) / 1000);
          const depth = Math.max(.035, (guardrail.postSectionDepthMm ?? guardrail.postSectionWidthMm ?? 45) / 1000);
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), postMat);
          mesh.position.set(post.base.xM, post.base.zM + height / 2 + deckOffset, post.base.yM);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          root.add(mesh);
        }
        for (const section of guardrail.sections) {
          root.add(cylinderBetween(
            { ...section.startTop, zM: section.startTop.zM + deckOffset },
            { ...section.endTop, zM: section.endTop.zM + deckOffset },
            .024,
            railMat,
          ));
        }
      }
    }

    if (layers.obstacles) {
      for (const obstacle of sceneModel.obstacles) {
        if (obstacle.kind === 'tree') {
          const radius = Math.max(.06, (obstacle.diameterM ?? Math.min(obstacle.widthM, obstacle.heightM)) * .12);
          const trunkHeight = .95;
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius * 1.18, trunkHeight, 12),
            new THREE.MeshStandardMaterial({ color: 0x76543b, roughness: .92 }),
          );
          const cx = obstacle.xM + (obstacle.diameterM ?? obstacle.widthM) / 2;
          const cy = obstacle.yM + (obstacle.diameterM ?? obstacle.heightM) / 2;
          trunk.position.set(cx, obstacle.topZM + trunkHeight / 2 + deckOffset, cy);
          trunk.castShadow = true;
          root.add(trunk);
          const crown = new THREE.Mesh(
            new THREE.SphereGeometry(Math.max(.32, radius * 4.5), 18, 12),
            new THREE.MeshStandardMaterial({ color: 0x739b65, roughness: 1 }),
          );
          crown.scale.set(1.15, .82, 1);
          crown.position.set(cx, obstacle.topZM + trunkHeight + .22 + deckOffset, cy);
          crown.castShadow = true;
          root.add(crown);
          continue;
        }

        if (obstacle.kind === 'pool') {
          const pool = new THREE.Mesh(
            new THREE.PlaneGeometry(Math.max(.05, obstacle.widthM), Math.max(.05, obstacle.heightM)),
            new THREE.MeshPhysicalMaterial({
              color: 0x73c7e6,
              roughness: .12,
              transmission: .18,
              transparent: true,
              opacity: .86,
              metalness: 0,
            }),
          );
          pool.rotation.x = -Math.PI / 2;
          pool.position.set(
            obstacle.xM + obstacle.widthM / 2,
            obstacle.topZM - .018 + deckOffset,
            obstacle.yM + obstacle.heightM / 2,
          );
          pool.receiveShadow = true;
          root.add(pool);
          continue;
        }

        const obstacleMaterial = new THREE.MeshStandardMaterial({
          color: obstacle.kind === 'post' ? 0x8d979d : 0xaeb7bd,
          roughness: .72,
          metalness: obstacle.kind === 'post' ? .28 : .08,
        });
        const height = obstacle.kind === 'post' ? .95 : .05;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(.04, obstacle.widthM), height, Math.max(.04, obstacle.heightM)),
          obstacleMaterial,
        );
        mesh.position.set(
          obstacle.xM + obstacle.widthM / 2,
          obstacle.topZM + height / 2 + deckOffset,
          obstacle.yM + obstacle.heightM / 2,
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
      }
    }

    const clock = new THREE.Clock();
    let animationFrame = 0;
    const renderLoop = () => {
      controls.update();
      renderer.render(world, camera);
      clock.getDelta();
      animationFrame = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const resize = new ResizeObserver(() => {
      const width = Math.max(320, host.clientWidth);
      const height = Math.max(360, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resize.observe(host);

    return () => {
      cancelAnimationFrame(animationFrame);
      resize.disconnect();
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      frameRef.current = null;

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      world.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material) => {
          materials.add(material);
          const map = (material as THREE.MeshStandardMaterial).map;
          if (map) textures.add(map);
          const bumpMap = (material as THREE.MeshStandardMaterial).bumpMap;
          if (bumpMap) textures.add(bumpMap);
        });
      });
      geometries.forEach((geometry) => geometry.dispose());
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [exploded, input, layers, layout, sceneModel, supportPlan]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = handActive;
  }, [handActive]);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const frame = frameRef.current;
    if (!camera || !controls || !frame) return;
    camera.position.set(frame.cameraXM, frame.cameraZM, frame.cameraYM);
    controls.target.set(frame.targetXM, frame.targetZM, frame.targetYM);
    controls.update();
  }, [resetKey]);

  return (
    <div className={`immersive3d-stage ${handActive ? 'hand-active' : 'hand-off'}`}>
      <div ref={hostRef} className="immersive3d-host" />
      <div className="immersive3d-help">
        {handActive
          ? <><strong>✋ Main active</strong><span>Glissez pour tourner • molette/pincement pour zoomer • clic droit/2 doigts pour déplacer</span></>
          : <><strong>Caméra verrouillée</strong><span>Activez la main pour explorer la terrasse.</span></>}
      </div>
      {webglError && <div className="immersive3d-error">{webglError}</div>}
      {sceneModel.diagnostics.length > 0 && (
        <div className="immersive3d-diagnostic">{sceneModel.diagnostics[0]}</div>
      )}
    </div>
  );
}
