import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DndContext, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { Calendar, GripVertical } from "lucide-react";
import type { DealRow } from "../../shared/types";
import { patch } from "../api";
import { useFetch } from "../hooks";
import { useToast } from "../components/Toast";
import { STAGES, fmtDateShort, fmtMoney } from "../format";

function DealCardStatic({ deal }: { deal: DealRow }) {
  return (
    <div className="deal-card">
      <div className="deal-card-name">{deal.name}</div>
      <div className="deal-card-org">{deal.organization_name ?? "—"}</div>
      <div className="deal-card-foot">
        <span className="deal-card-value">{fmtMoney(deal.value)}</span>
        <span className="deal-card-meta">
          <GripVertical size={12} className="muted" />
          <span className="prob">{deal.probability}%</span>
        </span>
      </div>
      {deal.close_date && (
        <div className="deal-card-meta" style={{ marginTop: 6 }}>
          <Calendar size={12} />
          <span>{fmtDateShort(deal.close_date)}</span>
        </div>
      )}
    </div>
  );
}

function DealCard({ deal }: { deal: DealRow }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(deal.id),
  });

  const isWon = deal.stage === "Won";
  const isLost = deal.stage === "Lost";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`deal-card ${isDragging ? "dragging" : ""}`}
      onClick={() => navigate(`/deals/${deal.id}`)}
    >
      <div className="deal-card-name">{deal.name}</div>
      <div className="deal-card-org">{deal.organization_name ?? "—"}</div>
      <div className="deal-card-foot">
        <span className="deal-card-value">{fmtMoney(deal.value)}</span>
        <span className={`deal-card-meta ${isWon || isLost ? "strike" : ""}`}>
          <GripVertical size={12} className="muted" />
          <span className="prob">{deal.probability}%</span>
        </span>
      </div>
      {deal.close_date && (
        <div className="deal-card-meta" style={{ marginTop: 6 }}>
          <Calendar size={12} />
          <span>{fmtDateShort(deal.close_date)}</span>
        </div>
      )}
    </div>
  );
}

function Column({
  stage,
  deals,
  isOver,
  setNodeRef,
}: {
  stage: string;
  deals: DealRow[];
  isOver: boolean;
  setNodeRef: (el: HTMLElement | null) => void;
}) {
  const total = deals.reduce((s, d) => s + d.value, 0);
  const expected = deals.reduce((s, d) => s + Number(d.expected_value ?? 0), 0);
  return (
    <div ref={setNodeRef} className={`pipeline-col ${isOver ? "drag-over" : ""}`}>
      <div className="pipeline-col-head">
        <div className="col-name">
          {stage}
          <span className="col-count">{deals.length}</span>
        </div>
        <div className="col-meta">
          <span className="col-value">{fmtMoney(total)}</span>
          {" · "}exp. {fmtMoney(expected)}
        </div>
      </div>
      <div className="pipeline-cards">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} />
        ))}
        {deals.length === 0 && (
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--gray-400)", padding: "18px 0" }}>
            No deals here
          </p>
        )}
      </div>
    </div>
  );
}

function DroppableColumn({ stage, deals }: { stage: string; deals: DealRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <Column stage={stage} deals={deals} isOver={isOver} setNodeRef={setNodeRef} />
  );
}

export function PipelinePage() {
  const toast = useToast();
  const { data, loading, reload } = useFetch<DealRow[]>("/api/deals");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const byStage = (stage: string) => (data ?? []).filter((d) => d.stage === stage);
  const activeDeal = data?.find((d) => String(d.id) === activeId);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    setOverStage(e.over ? String(e.over.id) : null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const fromId = String(e.active.id);
    const toStage = e.over ? String(e.over.id) : null;
    setActiveId(null);
    setOverStage(null);
    if (!toStage || !fromId) return;
    const deal = data?.find((d) => String(d.id) === fromId);
    if (!deal || deal.stage === toStage) return;
    try {
      await patch(`/api/deals/${deal.id}`, { stage: toStage });
      toast(`${deal.name} moved to ${toStage}`);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to move deal");
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Pipeline</h1>
          <div className="sub">Drag a deal to move it to another stage</div>
        </div>
        <div className="page-head-actions">
          <Link to="/deals" className="btn">View deals table</Link>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <DndContext onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActiveId(null); setOverStage(null); }}>
          <div className="pipeline-board">
            {STAGES.map((stage) => (
              <DroppableColumn key={stage} stage={stage} deals={byStage(stage)} />
            ))}
          </div>
          <DragOverlay>
            {activeDeal ? <div style={{ width: 220, opacity: 0.95 }}><DealCardStatic deal={activeDeal} /></div> : null}
          </DragOverlay>
        </DndContext>
      )}
      {overStage && <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 12 }}>Drop to move into {overStage}</p>}
    </div>
  );
}