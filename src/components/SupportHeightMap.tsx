import type { ProjectInput, SupportPlanResult } from '../domain/types';
import { getDeckBoundingSizeM, getDeckOutlinePointsM } from '../engine/geometry';

function markerFill(height: number, min: number, max: number, unsupported: boolean): string {
  if (unsupported) return '#b84d46';
  if (max <= min + 0.001) return '#315d78';
  const ratio = (height - min) / (max - min);
  if (ratio < 0.34) return '#4f7f65';
  if (ratio < 0.67) return '#b18b3a';
  return '#9b5a3b';
}

export function SupportHeightMap({
  project,
  plan,
}: {
  project: ProjectInput;
  plan?: SupportPlanResult;
}) {
  if (!plan || plan.status === 'unavailable') {
    return (
      <div className="support-map unavailable">
        <h3>Carte des hauteurs de plots</h3>
        <p>{plan?.note ?? 'Le plan de plots n’est pas disponible pour cette configuration.'}</p>
      </div>
    );
  }

  const bounds = getDeckBoundingSizeM(project);
  const outline = getDeckOutlinePointsM(project);
  const width = 680;
  const height = 390;
  const pad = 42;
  const scale = Math.min(
    (width - pad * 2) / Math.max(0.1, bounds.lengthM),
    (height - pad * 2) / Math.max(0.1, bounds.widthM),
  );
  const ox = pad + (width - pad * 2 - bounds.lengthM * scale) / 2;
  const oy = pad + (height - pad * 2 - bounds.widthM * scale) / 2;
  const polygon = outline.map((point) => `${ox + point.x * scale},${oy + point.y * scale}`).join(' ');
  const min = plan.minRequiredPlotHeightMm ?? 0;
  const max = plan.maxRequiredPlotHeightMm ?? min;
  const exactCount = plan.supportPoints
    .filter((point) => point.status === 'exact')
    .reduce((sum, point) => sum + point.multiplicity, 0);
  const totalCount = plan.supportPoints.reduce((sum, point) => sum + point.multiplicity, 0);

  return (
    <div className="support-map">
      <div className="support-map-heading">
        <div>
          <h3>Carte des hauteurs de plots</h3>
          <p>Chaque point correspond à un appui calculé sous une lambourde. Le nombre affiché est la hauteur de plot requise.</p>
        </div>
        <div className={`support-plan-status ${plan.status}`}>
          {plan.status === 'exact' ? 'Plan complet' : 'Plan partiel'}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="support-map-svg" role="img" aria-label="Carte des hauteurs des plots">
        <polygon points={polygon} fill="#f5f8fa" stroke="#173f63" strokeWidth="2" />

        {plan.joistSegments.map((segment) => (
          <line
            key={segment.id}
            x1={ox + segment.x1M * scale}
            y1={oy + segment.y1M * scale}
            x2={ox + segment.x2M * scale}
            y2={oy + segment.y2M * scale}
            stroke={segment.multiplicity === 2 ? '#9b5f2f' : segment.buttJointSupport ? '#9b7a57' : '#8b6749'}
            strokeWidth={segment.multiplicity === 2 ? 4.5 : 2.4}
            opacity="0.72"
          />
        ))}

        {plan.supportPoints.map((point) => {
          const x = ox + point.xM * scale;
          const y = oy + point.yM * scale;
          return (
            <g key={point.id}>
              <circle
                cx={x}
                cy={y}
                r={point.multiplicity === 2 ? 7 : 5.5}
                fill={markerFill(point.requiredPlotHeightMm, min, max, point.status === 'unsupported')}
                stroke="#fff"
                strokeWidth="1.5"
              >
                <title>{`${point.requiredPlotHeightMm.toFixed(0)} mm • ${point.plotLabel ?? 'plot à confirmer'}${point.multiplicity === 2 ? ' • double lambourde' : ''}`}</title>
              </circle>
              {plan.supportPoints.length <= 45 && (
                <text x={x + 7} y={y - 5} fontSize="7" fontWeight="800" fill="#486170">
                  {point.requiredPlotHeightMm.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="support-map-stats">
        <div><span>Appuis calculés</span><strong>{totalCount}</strong></div>
        <div><span>Appuis couverts</span><strong>{exactCount}</strong></div>
        <div><span>Hauteur mini</span><strong>{min.toFixed(0)} mm</strong></div>
        <div><span>Hauteur maxi</span><strong>{max.toFixed(0)} mm</strong></div>
        <div><span>Lambourdes à acheter</span><strong>{plan.joistStockBoards.length}</strong></div>
        <div>
          <span>{project.doubleJoistsAtButtJoints ? 'Axes doublés' : 'Jonctions détectées'}</span>
          <strong>{plan.buttJointAxisPositionsMm.length}</strong>
        </div>
      </div>

      <div className="plot-group-table">
        {plan.plotGroups.map((group) => (
          <div key={group.materialId} className="plot-group-row">
            <div>
              <strong>{group.label}</strong>
              <small>{group.minHeightMm}–{group.maxHeightMm} mm{group.productRef ? ` • réf. ${group.productRef}` : ''}</small>
            </div>
            <span>{group.quantity} plot(s)</span>
          </div>
        ))}
        {plan.unsupportedPointCount > 0 && (
          <div className="plot-group-row warning">
            <div>
              <strong>Hauteurs hors gamme connue</strong>
              <small>Ces appuis restent à valider avant commande.</small>
            </div>
            <span>{plan.unsupportedPointCount}</span>
          </div>
        )}
      </div>

      <div className="support-map-source">
        <strong>Règle utilisée :</strong> {plan.sourceLabel}. Les hauteurs sont calculées avec la hauteur finie, le profil de niveau saisi, l’épaisseur de lame et la lambourde 60×40 mm.
      </div>
    </div>
  );
}
