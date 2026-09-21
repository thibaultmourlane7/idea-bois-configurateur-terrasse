import { useMemo, useState, type FormEvent } from 'react';
import type { ConfiguratorResult, ProjectInput } from '../domain/types';
import { buildCommercialPayload } from '../commercial/payload';
import { demoCommercialAdapter } from '../commercial/demoAdapter';
import { assessCartReadiness, type CommercialIntent, type CustomerContact } from '../commercial/types';
import { buildShareUrl } from '../commercial/share';

type Props = {
  project: ProjectInput;
  result: ConfiguratorResult;
  version: string;
};

const intentCopy: Record<Exclude<CommercialIntent, 'cart'>, { title: string; subtitle: string; button: string }> = {
  'receive-project': {
    title: 'Recevoir mon projet',
    subtitle: 'Préparez l’envoi du récapitulatif et du PDF par e-mail.',
    button: 'Préparer l’envoi',
  },
  'quote-request': {
    title: 'Demander un devis',
    subtitle: 'Transmettez le projet complet à IDEA Bois pour vérification commerciale.',
    button: 'Préparer ma demande',
  },
  'advisor-callback': {
    title: 'Être rappelé',
    subtitle: 'Un conseiller pourra reprendre exactement votre configuration.',
    button: 'Préparer le rappel',
  },
};

const emptyContact: CustomerContact = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  postalCode: '',
  consent: false,
};

export function CommercialActions({ project, result, version }: Props) {
  const [intent, setIntent] = useState<Exclude<CommercialIntent, 'cart'> | null>(null);
  const [contact, setContact] = useState<CustomerContact>(emptyContact);
  const [feedback, setFeedback] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const cart = useMemo(() => assessCartReadiness(result), [result]);

  const copyShare = async () => {
    const url = buildShareUrl(project, window.location.href);
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('Lien du projet copié. Il peut être rouvert sur un autre appareil.');
    } catch {
      setFeedback('Le lien est prêt ci-dessous. Copiez-le pour partager le projet.');
    }
  };

  const submitContact = async (event: FormEvent) => {
    event.preventDefault();
    if (!intent || busy) return;
    if (!contact.firstName.trim() || !contact.lastName.trim() || !contact.email.trim() || !contact.postalCode.trim() || !contact.consent) {
      setFeedback('Merci de compléter les champs obligatoires et de valider le consentement.');
      return;
    }

    setBusy(true);
    try {
      const payload = buildCommercialPayload(intent, project, result, version, contact);
      const response = await demoCommercialAdapter.submit(payload);
      setFeedback(`${response.message} Référence : ${response.reference}`);
      setIntent(null);
      setContact(emptyContact);
    } finally {
      setBusy(false);
    }
  };

  const prepareCart = async () => {
    if (!cart.ready) {
      setFeedback(`Panier IDEA Bois pas encore activable : ${cart.blockers[0] ?? 'des données restent à valider.'}`);
      return;
    }
    const payload = buildCommercialPayload('cart', project, result, version);
    const response = await demoCommercialAdapter.submit(payload);
    setFeedback(`${response.message} Le connecteur panier sera activé après vente. Référence : ${response.reference}`);
  };

  return (
    <section className="commercial-panel">
      <div className="commercial-heading">
        <div>
          <span className="commercial-kicker">Et maintenant ?</span>
          <h3>Finalisez votre projet</h3>
          <p>Votre configuration reste identique quelle que soit l’action choisie.</p>
        </div>
        <span className="connection-pill">Connexions IDEA Bois : après vente</span>
      </div>

      <div className="commercial-grid">
        {(Object.keys(intentCopy) as Array<Exclude<CommercialIntent, 'cart'>>).map((key) => (
          <button type="button" className="commercial-card" key={key} onClick={() => { setIntent(key); setFeedback(''); }}>
            <span className="commercial-icon">{key === 'receive-project' ? '✉' : key === 'quote-request' ? '€' : '☎'}</span>
            <strong>{intentCopy[key].title}</strong>
            <small>{intentCopy[key].subtitle}</small>
          </button>
        ))}

        <button type="button" className="commercial-card" onClick={copyShare}>
          <span className="commercial-icon">↗</span>
          <strong>Partager mon projet</strong>
          <small>Crée un lien qui recharge réellement cette configuration.</small>
        </button>

        <button type="button" className={`commercial-card cart-card ${cart.ready ? 'ready' : 'locked'}`} onClick={prepareCart}>
          <span className="commercial-icon">🛒</span>
          <strong>Ajouter au panier</strong>
          <small>{cart.ready ? 'Panier techniquement prêt à transmettre.' : 'Préparé mais verrouillé tant que les références exactes ne sont pas toutes mappées.'}</small>
        </button>
      </div>

      {!cart.ready && (
        <details className="cart-readiness">
          <summary>Pourquoi le panier n’est-il pas encore activable ?</summary>
          <ul>{cart.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      )}

      {shareUrl && (
        <div className="share-result">
          <label>Lien partageable</label>
          <div><input value={shareUrl} readOnly onFocus={(e) => e.currentTarget.select()} /><button type="button" onClick={copyShare}>Copier</button></div>
        </div>
      )}

      {feedback && <div className="commercial-feedback">{feedback}</div>}

      {intent && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIntent(null)}>
          <div className="commercial-modal" role="dialog" aria-modal="true" aria-labelledby="commercial-modal-title" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Fermer" onClick={() => setIntent(null)}>×</button>
            <span className="commercial-kicker">Démo du parcours commercial</span>
            <h3 id="commercial-modal-title">{intentCopy[intent].title}</h3>
            <p>{intentCopy[intent].subtitle}</p>

            <form onSubmit={submitContact}>
              <div className="commercial-form-grid">
                <label>Prénom *<input value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} /></label>
                <label>Nom *<input value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} /></label>
                <label>E-mail *<input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></label>
                <label>Téléphone<input type="tel" value={contact.phone ?? ''} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></label>
                <label>Code postal *<input inputMode="numeric" value={contact.postalCode} onChange={(e) => setContact({ ...contact, postalCode: e.target.value })} /></label>
              </div>

              <label className="consent-line">
                <input type="checkbox" checked={contact.consent} onChange={(e) => setContact({ ...contact, consent: e.target.checked })} />
                <span>J’accepte que mes informations soient utilisées pour répondre à ma demande. Dans cette démo, aucune donnée n’est transmise ni stockée.</span>
              </label>

              <div className="demo-privacy-note">Mode démo : aucun e-mail, CRM, ERP ou panier IDEA Bois n’est appelé.</div>
              <button type="submit" className="primary-button commercial-submit" disabled={busy}>{busy ? 'Préparation…' : intentCopy[intent].button}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
