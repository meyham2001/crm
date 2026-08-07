import { STATUS_LABEL, STAGE_LABEL, type ContactStatus, type DealStage } from "../types";

export function StageBadge({ stage }: { stage: DealStage }) {
  return (
    <span className={`badge stage-${stage}`}>
      <span className="dot" />
      {STAGE_LABEL[stage]}
    </span>
  );
}

export function StatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span className={`badge status-${status}`}>
      <span className="dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}
