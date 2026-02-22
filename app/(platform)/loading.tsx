export default function PlatformLoading() {
  return (
    <>
      <div className="loading-skeleton">
        <div className="sk-header">
          <div className="sk-pill" style={{ width: 100 }} />
          <div className="sk-bar" style={{ width: 220, height: 28 }} />
          <div className="sk-bar" style={{ width: 340, height: 14 }} />
        </div>

        <div className="sk-stats">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="sk-stat-card">
              <div className="sk-bar" style={{ width: 80, height: 12 }} />
              <div className="sk-bar" style={{ width: 60, height: 24, marginTop: 12 }} />
              <div className="sk-bar" style={{ width: 100, height: 8, marginTop: 8 }} />
            </div>
          ))}
        </div>

        <div className="sk-grid">
          <div className="sk-card">
            <div className="sk-bar" style={{ width: 160, height: 16 }} />
            <div className="sk-bar" style={{ width: '100%', height: 180, marginTop: 16 }} />
          </div>
          <div className="sk-card">
            <div className="sk-bar" style={{ width: 120, height: 16 }} />
            {[1, 2, 3].map((i) => (
              <div key={i} className="sk-row">
                <div className="sk-circle" />
                <div style={{ flex: 1 }}>
                  <div className="sk-bar" style={{ width: '80%', height: 12 }} />
                  <div className="sk-bar" style={{ width: '50%', height: 10, marginTop: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .loading-skeleton {
          padding: 32px;
          max-width: 1200px;
          /* Inherit theme background — never hardcode white */
          background: transparent;
        }
        .sk-header { margin-bottom: 28px; }
        .sk-pill {
          height: 24px;
          border-radius: 12px;
          background: var(--g200, #E4E4E7);
          margin-bottom: 12px;
        }
        .sk-bar {
          border-radius: 6px;
          background: linear-gradient(
            90deg,
            var(--g200, #E4E4E7) 25%,
            var(--g100, #F4F4F5) 50%,
            var(--g200, #E4E4E7) 75%
          );
          background-size: 200% 100%;
          animation: skShimmer 1.5s ease infinite;
        }
        .sk-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .sk-stat-card {
          background: var(--wh, #ffffff);
          border: 1px solid var(--brd, #E4E4E7);
          border-radius: 14px;
          padding: 20px;
        }
        .sk-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
        .sk-card {
          background: var(--wh, #ffffff);
          border: 1px solid var(--brd, #E4E4E7);
          border-radius: 14px;
          padding: 20px;
        }
        .sk-row { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
        .sk-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--g200, #E4E4E7);
          flex-shrink: 0;
        }
        @keyframes skShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 768px) {
          .sk-stats { grid-template-columns: 1fr 1fr; }
          .sk-grid  { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .sk-stats { grid-template-columns: 1fr; }
          .loading-skeleton { padding: 20px; }
        }
      `}</style>
    </>
  )
}
