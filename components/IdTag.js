export default function IdTag({ id, className = '' }) {
  return <span className={`id-tag ${className}`}>{id}</span>;
}
