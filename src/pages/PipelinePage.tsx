import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { api } from "../api";
import { useData } from "../hooks";
import { fmtDateShort, fmtMoney, fmtMoneyCompact } from "../format";
import { errMsg, STAGE_LABEL, STAGES, type DealRow, type DealStage } from "../types";
import { ErrorBanner, Loading, PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

export default function PipelinePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useData(() => api<DealRow[]>("/deals"), []);
  const [activeDeal, setActiveDeal] = useState<DealRow | null>(null);
  const [optimistic, setOptimistic] = useState<Record<number, DealStage>>({});
  const justDragged = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const deals = useMemo(
    () => (data ?? []).map((d) => (optimistic[d.id] && optimistic[d.id] !== d.stage ? { ...d, stage: optimistic[d.id] } : d)),
    [data, optimistic]
  );

  const byStage = useMemo(() => {
    const map = new Map<DealStage, DealRow[]>();
    STAGES.forEach((s) => map.set(s, []));
    deals.forEach((d) => map.get(d.stage)!.push(d));
    return map;
  }, [deals]);

  function handleDragStart(e: DragStartEvent) {
    setActiveDeal(e.active.data.current?.deal ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    const deal = activeDeal;
    setActiveDeal(null);
    if (!deal || !e.over) return;
    const stage = e.over.id as DealStage;
    if (!STAGES.includes(stage) || stage === deal.stage) return;

    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 150);

    setOptimistic((o) => ({ ...o, [deal.id]: stage }));
    try {
      await api(`/deals/${deal.id}`, { method: "PATCH", body: JSON.stringify({ stage }) });
      toast(`“${deal.name}” moved to ${STAGE_LABEL[stage]}`);
      await reload();
    } catch (err) {
      toast(errMsg(err), "error");
      reload();
    } finally {
      setOptimistic((o) => {
        const next = { ...o };
        delete next[deal.id];
        return next;
      });
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorBanner message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Drag a deal between columns to change its stage"
      />
      <div className="board-wrap">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDeal(null)}
        >
          <div className="board">
            {STAGES.map((stage) => {
              const items = byStage.get(stage)!;
              const total = items.reduce((s, d) => s + d.value, 0);
              const expected = items.reduce((s, d) => s + (d.value * d.probability) / 100, 0);
              return (
                <StageColumn
                  key={stage}
                  stage={stage}
                  deals={items}
                  total={total}
                  expected={expected}
                  draggingId={activeDeal?.id ?? null}
                  onOpen={(id) => {
                    if (!justDragged.current) navigate(`/deals/${id}`);
                  }}
                />
              );
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDeal ? <DealCard deal={activeDeal} overlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
}

function StageColumn({
  stage,
  deals,
  total,
  expected,
  draggingId,
  onOpen
}: {
  stage: DealStage;
  deals: DealRow[];
  total: number;
  expected: number;
  draggingId: number | null;
  onOpen: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section className={`stage-col${isOver ? " over" : ""}`} aria-label={`${STAGE_LABEL[stage]} column`}>
      <header className="stage-head">
        <span className={`stage-dot stage-${stage}`} />
        <span className="stage-name">{STAGE_LABEL[stage]}</span>
        <span className="stage-count">{deals.length}</span>
      </header>
      <div className="stage-totals">
        <span>{fmtMoneyCompact(total)}</span>
        {stage !== "won" && stage !== "lost" && (
          <>
            <span className="muted">·</span>
            <span className="muted">{fmtMoneyCompact(Math.round(expected))} expected</span>
          </>
        )}
      </div>
      <div className="stage-cards" ref={setNodeRef}>
        {deals.map((deal) => (
          <DraggableDealCard key={deal.id} deal={deal} dimmed={deal.id === draggingId} onOpen={onOpen} />
        ))}
        {deals.length === 0 && <div className="stage-empty">Drop a deal here</div>}
      </div>
    </section>
  );
}

function DraggableDealCard({ deal, dimmed, onOpen }: { deal: DealRow; dimmed: boolean; onOpen: (id: number) => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: deal.id, data: { deal } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`deal-card${dimmed ? " dragging" : ""}`}
      onClick={() => onOpen(deal.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(deal.id);
      }}
    >
      <DealCardBody deal={deal} />
    </div>
  );
}

function DealCard({ deal, overlay = false }: { deal: DealRow; overlay?: boolean }) {
  return (
    <div className={`deal-card${overlay ? " overlay" : ""}`}>
      <DealCardBody deal={deal} />
    </div>
  );
}

function DealCardBody({ deal }: { deal: DealRow }) {
  return (
    <>
      <div className="deal-card-name">{deal.name}</div>
      <div className="deal-card-org">{deal.organization_name ?? "No organization"}</div>
      <div className="deal-card-meta">
        <span className="deal-value">{fmtMoney(deal.value)}</span>
        <span className="muted">{deal.close_date ? fmtDateShort(deal.close_date) : `${deal.probability}%`}</span>
      </div>
    </>
  );
}
