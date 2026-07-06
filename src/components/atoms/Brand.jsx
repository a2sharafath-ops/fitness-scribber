// App brand lockup: Cureocity logo mark + two-line wordmark.
// "Fitness Partner" bold, "by Cureocity" light — per the Cureocity design system.
export default function Brand({ style }) {
  return (
    <div className="brand" style={style}>
      <img className="logo" src="/cureocity-logo.png" alt="" aria-hidden="true" />
      <span className="brand-text">
        <span className="brand-name">Fitness Partner</span>
        <span className="brand-by">by Cureocity</span>
      </span>
    </div>
  )
}
