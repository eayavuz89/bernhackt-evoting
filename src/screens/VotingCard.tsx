import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useA11y } from "../context/AccessibilityContext";
import { CARD, PROPOSALS } from "../lib/data";

// Barrier-free Stimmrechtsausweis following the official Swiss Post card
// structure (briefing PDF): election period, portal URL + SHA-256 fingerprint,
// shape-coded code blocks (▲ ◆ ⬟ ★ — colour-blind safe), per-option Prüfcodes,
// 7-step instructions, support — plus accessibility extras: large type, high
// contrast, big QR sign-in, tactile/Braille marker.
export default function VotingCard() {
  const a = useA11y();
  const loginUrl = `${window.location.origin}/login?init=${CARD.initCode.replace(/\s/g, "")}`;

  return (
    <div className="card-page">
      <div className="card-toolbar no-print">
        <Link className="btn btn-ghost" to="/">
          ← {a.tr("backToPortal")}
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          🖨️ {a.tr("print")}
        </button>
      </div>

      <article className="voting-card" aria-label={a.tr("cardTitle")}>
        <div className="vc-braille" aria-hidden="true" title={a.tr("cardBraille")}>
          ⠓⠍
        </div>

        <header className="vc-header">
          <div>
            <h1 className="vc-title">{a.tr("cardTitle")}</h1>
            <p className="vc-subtitle">{a.tr("cardSubtitle")}</p>
          </div>
          <span className="vc-logo" aria-hidden="true">
            🗳️
          </span>
        </header>

        <dl className="vc-meta">
          <div>
            <dt>{a.tr("cardName")}</dt>
            <dd>{CARD.name}</dd>
          </div>
          <div>
            <dt>{a.tr("cardMunicipality")}</dt>
            <dd>{CARD.municipality}</dd>
          </div>
          <div>
            <dt>{a.tr("cardVoteDate")}</dt>
            <dd>{CARD.voteDate}</dd>
          </div>
        </dl>

        {/* Election period + portal link + certificate fingerprint (official) */}
        <div className="vc-portal">
          <p className="vc-portal-period">
            <strong>{a.tr("cardPeriod")}:</strong> {CARD.votePeriod}
          </p>
          <p className="vc-portal-label">{a.tr("cardPortal")}</p>
          <p className="vc-portal-url">{CARD.portalUrl}</p>
          <p className="vc-portal-fp">
            <span>{a.tr("cardFingerprint")}:</span> <code>{CARD.fingerprint}</code>
          </p>
        </div>

        <div className="vc-scan">
          <div className="vc-qr">
            <QRCodeSVG value={loginUrl} size={128} level="M" />
          </div>
          <p className="vc-scan-hint">{a.tr("cardScanHint")}</p>
        </div>

        {/* Shape-coded code blocks — matches the portal's symbols */}
        <div className="vc-codes">
          <div className="vc-code-block vc-code-init">
            <span className="vc-sym" aria-hidden="true">▲</span>
            <div>
              <span className="vc-code-label">{a.tr("cardInit")}</span>
              <span className="vc-code-value">{CARD.initCode}</span>
            </div>
          </div>

          <div className="vc-code-block">
            <span className="vc-sym" aria-hidden="true">◆</span>
            <div className="vc-grow">
              <span className="vc-code-label">{a.tr("cardChoiceCodes")}</span>
              <ul className="vc-choice-codes">
                {PROPOSALS.map((p, i) => (
                  <li key={p.id}>
                    <span className="vc-choice-num">{i + 1}</span>
                    <span className="vc-choice-title">{p.title[a.lang]}</span>
                    <span className="vc-choice-pairs">
                      <span className="vc-choice-pair">
                        {a.tr("yes")}_<strong>{p.codes.yes}</strong>
                      </span>
                      <span className="vc-choice-pair">
                        {a.tr("no")}_<strong>{p.codes.no}</strong>
                      </span>
                      <span className="vc-choice-pair">
                        {a.tr("blank")}_<strong>{p.codes.blank}</strong>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="vc-code-block vc-code-confirm">
            <span className="vc-sym" aria-hidden="true">⬟</span>
            <div>
              <span className="vc-code-label">{a.tr("cardConfirm")}</span>
              <span className="vc-code-value">{CARD.confirmCode}</span>
            </div>
          </div>

          <div className="vc-code-block vc-code-final">
            <span className="vc-sym" aria-hidden="true">★</span>
            <div>
              <span className="vc-code-label">{a.tr("cardFinalize")}</span>
              <span className="vc-code-value">{CARD.finalizeCode}</span>
            </div>
          </div>
        </div>

        {/* 7-step instructions (official flow) */}
        <section className="vc-inst">
          <h2 className="vc-inst-title">{a.tr("cardInstTitle")}</h2>
          <ol className="vc-inst-list">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <li key={n}>{a.tr("inst" + n)}</li>
            ))}
          </ol>
        </section>

        <div className="vc-bottom">
          <div className="vc-security">
            <strong>{a.tr("cardSecurity")}:</strong> {a.tr("securityHint")}
          </div>
          <div className="vc-support">
            <strong>{a.tr("cardSupport")}:</strong> {CARD.support}
          </div>
        </div>

        <footer className="vc-footer">
          <span aria-hidden="true">⠿⠿⠿</span> {a.tr("cardBraille")}
        </footer>
      </article>
    </div>
  );
}
