import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useA11y } from "../AccessibilityContext";
import { CARD, PROPOSALS } from "../data";

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

      {/* The physical voting card layout. Barrier-free: high contrast, large type,
          clear zones, tactile/Braille marker, big scannable QR. */}
      <article className="voting-card" aria-label={a.tr("cardTitle")}>
        <div className="vc-braille" aria-hidden="true" title={a.tr("cardBraille")}>
          ⠓⠍ {/* decorative Braille marker */}
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

        <div className="vc-scan">
          <div className="vc-qr">
            <QRCodeSVG value={loginUrl} size={128} level="M" />
          </div>
          <p className="vc-scan-hint">{a.tr("cardScanHint")}</p>
        </div>

        <div className="vc-codes">
          <div className="vc-code-block vc-code-init">
            <span className="vc-code-label">1 · {a.tr("cardInit")}</span>
            <span className="vc-code-value">{CARD.initCode}</span>
          </div>

          <div className="vc-code-block">
            <span className="vc-code-label">{a.tr("cardChoiceCodes")}</span>
            <ul className="vc-choice-codes">
              {PROPOSALS.map((p, i) => (
                <li key={p.id}>
                  <span className="vc-choice-num">{i + 1}</span>
                  <span className="vc-choice-pair">
                    <em>{a.tr("yes")}</em> {p.codes.yes}
                  </span>
                  <span className="vc-choice-pair">
                    <em>{a.tr("no")}</em> {p.codes.no}
                  </span>
                  <span className="vc-choice-pair">
                    <em>{a.tr("blank")}</em> {p.codes.blank}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="vc-code-block vc-code-confirm">
            <span className="vc-code-label">3 · {a.tr("cardConfirm")}</span>
            <span className="vc-code-value">{CARD.confirmCode}</span>
          </div>

          <div className="vc-code-block vc-code-final">
            <span className="vc-code-label">4 · {a.tr("cardFinalize")}</span>
            <span className="vc-code-value">{CARD.finalizeCode}</span>
          </div>
        </div>

        <footer className="vc-footer">
          <span aria-hidden="true">⠿⠿⠿</span> {a.tr("cardBraille")}
        </footer>
      </article>
    </div>
  );
}
