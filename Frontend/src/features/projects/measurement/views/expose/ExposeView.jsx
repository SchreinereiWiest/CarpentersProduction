import { useEffect, useMemo, useRef, useState } from "react";
import {
  COVER_BLOCK_LAYOUTS,
  EXPOSE_LANDSCAPE_HEIGHT,
  EXPOSE_LANDSCAPE_WIDTH,
  getExposeCoverText,
  getExposeBlockLayout,
  getCabinetImageLayouts,
  getVisualTemplateLayouts,
  normalizeExposeTemplateId
} from "@EngineBrowser/project-pdf/exposeLayout.js";
import {
  createCabinetSvg,
  getCabinetFunctionLines,
  getCabinetInformation
} from "@EngineBrowser/project-pdf/cabinetSvgRenderer.js";
import {
  createCncProgramSvg,
  getCncPrograms
} from "@EngineBrowser/project-pdf/cncProgramSvgRenderer.js";
import {
  createNestingPlateSvg,
  getNestingPlateEntries
} from "@EngineBrowser/project-pdf/nestingSvgRenderer.js";
import { paginateNestingCuts } from "@Engine/nesting/cutPlan.js";
import { measurementViewSvgDataUrl } from "@EngineBrowser/project-pdf/measurementViewSvgRenderer.js";
import AufmasIcon from "../../components/common/AufmasIcon.jsx";
import {
  formatExposeDate,
  normalizeExpose
} from "../../expose/exposeDefaults.js";

const PAGE_WIDTH = EXPOSE_LANDSCAPE_WIDTH;
const PAGE_HEIGHT = EXPOSE_LANDSCAPE_HEIGHT;
const GRID_STEP_MM = 5;
const PAGE_RENDER_SCALE = 3;
const POSITION_INPUT =
  "mt-1 w-full rounded-md border border-[#344651] bg-[#10181f] px-2.5 py-2 text-xs text-[#dfe9ef] outline-none focus:border-[#5f9cc4] disabled:opacity-50";

const svgDataUrl = (svg) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const COVER_TEXT_FONT_SIZES = {
  eyebrow: 7,
  leftTitle: 23,
  subtitle: 8.5,
  status: 6.5,
  rightTitle: 26,
  description: 9.2
};
const VISUAL_TEXT_FONT_SIZES = { title: 12.5, body: 7.4 };
const fontSizeInCqw = (fontSize, pageWidth) =>
  `${(clamp(Number(fontSize) || 9, 5, 36) * 0.3528 / pageWidth) * 100}cqw`;

const projectPhotos = (photos) =>
  photos.filter(
    (photo) =>
      photo.category !== "production-attachment" &&
      photo.category !== "measurement-image"
  );

const customBlocksForPage = (expose, pageId) =>
  Array.isArray(expose.customBlocks?.[pageId])
    ? expose.customBlocks[pageId]
    : [];

const customBlockLabel = (type) => ({
  text: "Textfeld",
  image: "Projektbild",
  logo: "Unternehmenslogo"
}[type] ?? "Objekt");

function CustomBlocks({
  page,
  expose,
  photos,
  companySettings,
  editable,
  selectedBlockId,
  setSelectedBlockId,
  readOnly,
  snapTolerance,
  pageRef,
  baseLayouts,
  onLayoutChange,
  onTextChange,
  onGuidesChange
}) {
  const customBlocks = customBlocksForPage(expose, page.id);
  const allLayouts = [
    ...baseLayouts,
    ...customBlocks.map((block) => ({ id: block.id, ...block.layout }))
  ];

  return customBlocks.map((block) => {
    const definition = {
      id: block.id,
      label: customBlockLabel(block.type),
      type: block.type === "logo" ? "logo" : block.type,
      defaultFontSize: block.type === "text" ? 9 : undefined,
      custom: true
    };
    const source = block.type === "logo"
      ? companySettings?.branding?.logoDataUrl
      : photos.find((photo) => String(photo.id) === String(block.imageId))?.url;
    let content;
    if (block.type === "text") {
      content = editable && !readOnly ? (
        <textarea
          data-expose-field
          value={String(block.text ?? "")}
          onChange={(event) => onTextChange(block.id, event.target.value)}
          className="h-full w-full resize-none overflow-hidden bg-transparent p-0 leading-[1.35] text-[#24333b] outline-none"
          style={{ fontSize: fontSizeInCqw(block.layout.fontSize ?? 9, page.width) }}
          aria-label="Textfeld"
        />
      ) : (
        <div className="h-full whitespace-pre-wrap leading-[1.35] text-[#24333b]" style={{ fontSize: fontSizeInCqw(block.layout.fontSize ?? 9, page.width) }}>{block.text}</div>
      );
    } else if (source) {
      content = (
        <div className="h-full w-full overflow-hidden bg-white">
          <img
            src={source}
            alt=""
            draggable="false"
            className="h-full w-full select-none object-contain"
            style={{
              objectPosition: `${block.layout.cropX ?? 50}% ${block.layout.cropY ?? 50}%`,
              transform: `scale(${block.layout.zoom ?? 1})`,
              transformOrigin: `${block.layout.cropX ?? 50}% ${block.layout.cropY ?? 50}%`
            }}
          />
        </div>
      );
    } else {
      content = (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-[#91a0a8] bg-white text-center text-[0.75cqw] font-semibold text-[#71848f]">
          {block.type === "logo" ? "Logo in den Unternehmenseinstellungen hinterlegen" : "Bild wählen"}
        </div>
      );
    }

    return (
      <EditableBlock
        key={block.id}
        page={page}
        block={definition}
        layout={block.layout}
        allLayouts={allLayouts}
        selected={editable && selectedBlockId === block.id}
        readOnly={!editable || readOnly}
        snapTolerance={snapTolerance}
        pageRef={pageRef}
        onSelect={setSelectedBlockId}
        onLayoutChange={(next) => onLayoutChange(block.id, next)}
        onGuidesChange={onGuidesChange}
      >
        {content}
      </EditableBlock>
    );
  });
}

function useBlockDrawing({ page, pageRef, insertTool, snapTolerance, onCreate }) {
  const interaction = useRef(null);
  const draftRef = useRef(null);
  const [draft, setDraft] = useState(null);

  const updateDraft = (value) => {
    draftRef.current = value;
    setDraft(value);
  };

  const pointFromEvent = (event) => {
    const bounds = pageRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds?.height) return null;
    return {
      x: clamp((event.clientX - bounds.left) * page.width / bounds.width, 0, page.width),
      y: clamp((event.clientY - bounds.top) * page.height / bounds.height, 0, page.height)
    };
  };

  const start = (event) => {
    if (!insertTool || event.button !== 0 || event.target.closest("[data-expose-ui]")) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    interaction.current = { pointerId: event.pointerId, start: point, target: event.currentTarget };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateDraft({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const move = (event) => {
    const current = interaction.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    const snap = (value) => snapTolerance > 0 && !event.altKey
      ? Math.round(value / GRID_STEP_MM) * GRID_STEP_MM
      : value;
    const x1 = snap(Math.min(current.start.x, point.x));
    const y1 = snap(Math.min(current.start.y, point.y));
    const x2 = snap(Math.max(current.start.x, point.x));
    const y2 = snap(Math.max(current.start.y, point.y));
    updateDraft({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
  };

  const finish = (event) => {
    const current = interaction.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const defaults = insertTool === "text"
      ? { width: 70, height: 24 }
      : insertTool === "logo"
        ? { width: 55, height: 28 }
        : { width: 90, height: 62 };
    const drawnLayout = draftRef.current;
    const candidate = drawnLayout && drawnLayout.width >= 8 && drawnLayout.height >= 6
      ? drawnLayout
      : {
          x: clamp(current.start.x, 0, page.width - defaults.width),
          y: clamp(current.start.y, 0, page.height - defaults.height),
          ...defaults
        };
    onCreate(insertTool, {
      ...candidate,
      cropX: 50,
      cropY: 50,
      zoom: 1
    });
    current.target.releasePointerCapture?.(event.pointerId);
    interaction.current = null;
    updateDraft(null);
  };

  const cancelDrawing = (event) => {
    const current = interaction.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.target.releasePointerCapture?.(event.pointerId);
    interaction.current = null;
    updateDraft(null);
  };

  return {
    draft,
    drawingProps: {
      onPointerDownCapture: start,
      onPointerMoveCapture: move,
      onPointerUpCapture: finish,
      onPointerCancelCapture: cancelDrawing
    }
  };
}

function DrawingDraft({ page, draft }) {
  if (!draft) return null;
  return (
    <div
      className="pointer-events-none absolute z-[70] border-2 border-dashed border-[#319bd8] bg-[#58b8ec]/15"
      style={{
        left: `${draft.x / page.width * 100}%`,
        top: `${draft.y / page.height * 100}%`,
        width: `${draft.width / page.width * 100}%`,
        height: `${draft.height / page.height * 100}%`
      }}
    />
  );
}

function createExposePages({
  expose,
  project,
  photos,
  views,
  pdfPages,
  objects,
  dxfLayers,
  cabinets,
  partsList,
  partsListPdfPages,
  nesting,
  measurementLabelOffsetY
}) {
  const pages = [
    {
      id: "cover",
      kind: "cover",
      label: "Titelseite",
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      optional: false
    }
  ];

  if (expose.sections.perspectives !== false) {
    const legacySelection = expose.selectedImageIds.length
      ? new Set(expose.selectedImageIds)
      : null;
    projectPhotos(photos).forEach((photo, index) => {
      const defaultTitle = `Perspektive ${index + 1}`;
      const customTitle = expose.assetText[photo.id]?.title;
      pages.push({
        id: `image:${photo.id}`,
        assetId: String(photo.id),
        kind: "visual",
        visualKind: "image",
        label: String(customTitle ?? "").trim() || defaultTitle,
        defaultTitle,
        source: photo.url,
        defaultEnabled: !legacySelection || legacySelection.has(String(photo.id)),
        optional: true,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        section: "01 / PROJEKTEXPOSÉ",
        heading: expose.text.perspectivesHeading,
        fallbackBody: expose.text.perspectivesBody
      });
    });
  }

  if (expose.sections.measurement !== false) {
    const legacySelection = expose.selectedViewIds.length
      ? new Set(expose.selectedViewIds)
      : null;
    views
      .filter((view) => !["three", "images", "expose"].includes(view.type))
      .forEach((view, index) => {
        const defaultLabel = view.type === "floor" ? "Grundriss" : `Ansicht ${index + 1}`;
        const customTitle = expose.assetText[view.id]?.title;
        const photo = view.imageFileId
          ? photos.find((item) => item.id === view.imageFileId)
          : null;
        const plan = view.planFileId
          ? pdfPages[`${view.planFileId}:${view.pageNumber || 1}`]
          : null;
        const source = measurementViewSvgDataUrl({
          view,
          objects,
          planPage: plan ?? (photo?.url ? { url: photo.url } : null),
          dxf: dxfLayers[view.id],
          measurementLabelOffsetY
        });
        pages.push({
          id: `view:${view.id}`,
          assetId: String(view.id),
          kind: "visual",
          visualKind: "view",
          label: String(customTitle ?? "").trim() || defaultLabel,
          defaultTitle: defaultLabel,
          source,
          placeholderIcon: view.type === "floor" ? "floor" : "side",
          defaultEnabled: !legacySelection || legacySelection.has(String(view.id)),
          optional: true,
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          section: "02 / AUFMASS & PLANUNG",
          heading: expose.text.measurementHeading,
          fallbackBody: expose.text.measurementBody
        });
      });
  }

  if (expose.sections.cabinets !== false) {
    for (let index = 0; index < cabinets.length; index += 2) {
      pages.push({
        id: `cabinet:${index / 2}`,
        kind: "cabinet",
        label: `Korpusblätter ${index + 1}–${Math.min(index + 2, cabinets.length)}`,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        cabinets: cabinets.slice(index, index + 2),
        section: "03 / EINZELBAUTEILE"
      });
    }
  }

  if (expose.sections.partsList !== false) {
    (partsListPdfPages ?? []).forEach((pdfPage, index) => {
      pages.push({
        id: `parts:${index}`,
        kind: "parts",
        label: `Teileliste ${index + 1}`,
        width: 210,
        height: 297,
        source: pdfPage.dataUrl,
        section: "04 / FERTIGUNGSSTÜCKLISTE"
      });
    });
  }

  if (expose.sections.cnc !== false) {
    const programs = getCncPrograms(partsList);
    const programsPerPage = expose.cncProgramsPerPage;
    for (let index = 0; index < programs.length; index += programsPerPage) {
      const pageIndex = index / programsPerPage;
      pages.push({
        id: `cnc:${pageIndex}`,
        kind: "cnc",
        label: `CNC-Programme ${index + 1}–${Math.min(index + programsPerPage, programs.length)}`,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        section: "05 / CNC-PROGRAMME",
        programs: programs.slice(index, index + programsPerPage),
        programsPerPage
      });
    }
  }

  if (expose.sections.nesting !== false) {
    getNestingPlateEntries(nesting).forEach((entry) => {
      const result = createNestingPlateSvg(entry);
      if (!result) return;
      const cutPages = paginateNestingCuts(result.plan.cuts);
      cutPages.forEach((cutPage) => {
        pages.push({
          id: `nesting:${entry.groupIndex}:${entry.plateIndex}:${cutPage.pageIndex}`,
          kind: "nesting",
          label: `${result.plan.material} · Platte ${result.plan.plateNumber}${cutPage.pageCount > 1 ? ` · Folge ${cutPage.pageIndex + 1}/${cutPage.pageCount}` : ""}`,
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          section: "06 / ZUSCHNITT & NESTING",
          nestingSvg: svgDataUrl(result.svg),
          plan: result.plan,
          cutPage
        });
      });
    });
  }

  if (pages.length === 1 && !project) return [];
  const orderedPages = [];
  const inserted = new Set();
  const manualPages = expose.manualPages.map((manual, index) => ({
    id: String(manual.id ?? `manual:${index}`),
    kind: "manual",
    label: manual.label || `Eigene Seite ${index + 1}`,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    manual,
    templateId: normalizeExposeTemplateId(expose.pageTemplates?.[manual.id] ?? manual.templateId, "title")
  }));
  const appendAfter = (pageId) => {
    manualPages.filter((page) => page.manual.afterPageId === pageId && !inserted.has(page.id)).forEach((page) => {
      inserted.add(page.id);
      orderedPages.push(page);
      appendAfter(page.id);
    });
  };
  pages.forEach((page) => {
    const fallbackTemplate = page.kind === "cover"
      ? "title"
      : page.kind === "cabinet"
        ? "cabinet-standard"
        : "info";
    orderedPages.push({
      ...page,
      templateId: ["parts", "nesting"].includes(page.kind)
        ? null
        : normalizeExposeTemplateId(expose.pageTemplates?.[page.id], fallbackTemplate)
    });
    appendAfter(page.id);
  });
  manualPages.filter((page) => !inserted.has(page.id)).forEach((page) => orderedPages.push(page));
  const pageById = new Map(orderedPages.map((page) => [page.id, page]));
  const sortedPages = [];
  expose.pageOrder.forEach((pageId) => {
    const page = pageById.get(pageId);
    if (!page) return;
    sortedPages.push(page);
    pageById.delete(pageId);
  });
  return [...sortedPages, ...pageById.values()];
}

function findSnapDelta(anchors, targets, tolerance) {
  let best = null;
  anchors.forEach((anchor) => {
    targets.forEach((target) => {
      const delta = target - anchor;
      if (Math.abs(delta) <= tolerance && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, target };
      }
    });
  });
  return best;
}

function snapBlockLayout({
  layout,
  mode,
  page,
  otherLayouts,
  tolerance,
  disabled
}) {
  const next = { ...layout };
  if (disabled) return { layout: next, guides: null };
  const xTargets = [12, page.width / 2, page.width - 12];
  const yTargets = [12, page.height / 2, page.height - 12];
  otherLayouts.forEach((item) => {
    xTargets.push(item.x, item.x + item.width / 2, item.x + item.width);
    yTargets.push(item.y, item.y + item.height / 2, item.y + item.height);
  });

  const gridX = Math.round(next.x / GRID_STEP_MM) * GRID_STEP_MM;
  const gridY = Math.round(next.y / GRID_STEP_MM) * GRID_STEP_MM;
  xTargets.push(gridX);
  yTargets.push(gridY);
  let xSnap;
  let ySnap;

  if (mode === "resize") {
    const right = next.x + next.width;
    const bottom = next.y + next.height;
    const gridRight = Math.round(right / GRID_STEP_MM) * GRID_STEP_MM;
    const gridBottom = Math.round(bottom / GRID_STEP_MM) * GRID_STEP_MM;
    xSnap = findSnapDelta([right], [...xTargets, gridRight], tolerance);
    ySnap = findSnapDelta([bottom], [...yTargets, gridBottom], tolerance);
    if (xSnap) next.width += xSnap.delta;
    if (ySnap) next.height += ySnap.delta;
  } else {
    xSnap = findSnapDelta(
      [next.x, next.x + next.width / 2, next.x + next.width],
      xTargets,
      tolerance
    );
    ySnap = findSnapDelta(
      [next.y, next.y + next.height / 2, next.y + next.height],
      yTargets,
      tolerance
    );
    if (xSnap) next.x += xSnap.delta;
    if (ySnap) next.y += ySnap.delta;
  }

  next.width = Math.max(8, next.width);
  next.height = Math.max(6, next.height);
  next.x = clamp(next.x, 0, page.width - next.width);
  next.y = clamp(next.y, 0, page.height - next.height);
  return {
    layout: next,
    guides: {
      x: xSnap?.target ?? null,
      y: ySnap?.target ?? null
    }
  };
}

function EditableBlock({
  page,
  block,
  layout,
  allLayouts,
  selected,
  readOnly,
  snapTolerance,
  pageRef,
  onSelect,
  onLayoutChange,
  onGuidesChange,
  children
}) {
  const interaction = useRef(null);

  const begin = (event, mode) => {
    onSelect(block.id);
    if (readOnly || event.button !== 0) return;
    if (event.target.closest("[data-expose-field]") && mode !== "resize") return;
    event.preventDefault();
    event.stopPropagation();
    interaction.current = {
      mode,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      layout,
      captureTarget: event.currentTarget
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const move = (event) => {
    const current = interaction.current;
    if (!current || current.pointerId !== event.pointerId || !pageRef.current) return;
    event.preventDefault();
    const bounds = pageRef.current.getBoundingClientRect();
    const dx = (event.clientX - current.clientX) * page.width / bounds.width;
    const dy = (event.clientY - current.clientY) * page.height / bounds.height;
    const proposed = current.mode === "resize"
      ? {
          ...current.layout,
          width: Math.max(8, current.layout.width + dx),
          height: Math.max(6, current.layout.height + dy)
        }
      : {
          ...current.layout,
          x: current.layout.x + dx,
          y: current.layout.y + dy
        };
    const snapped = snapBlockLayout({
      layout: proposed,
      mode: current.mode,
      page,
      otherLayouts: allLayouts.filter((entry) => entry.id !== block.id),
      tolerance: snapTolerance,
      disabled: event.altKey || snapTolerance <= 0
    });
    onLayoutChange(snapped.layout);
    onGuidesChange(snapped.guides);
  };

  const finish = (event) => {
    const current = interaction.current;
    if (current?.pointerId !== event.pointerId) return;
    interaction.current = null;
    onGuidesChange(null);
    current.captureTarget?.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div
      className={`absolute overflow-hidden ${selected ? "z-30 ring-2 ring-[#62b5e8] ring-offset-1 ring-offset-transparent" : readOnly ? "z-10" : "z-10 hover:ring-1 hover:ring-[#62b5e8]/60"} ${readOnly ? "" : "cursor-move"}`}
      style={{
        left: `${layout.x / page.width * 100}%`,
        top: `${layout.y / page.height * 100}%`,
        width: `${layout.width / page.width * 100}%`,
        height: `${layout.height / page.height * 100}%`
      }}
      onPointerDown={(event) => begin(event, "move")}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
      onClick={(event) => {
        if (!readOnly) {
          event.stopPropagation();
          onSelect(block.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${block.label} auswählen`}
    >
      {children}
      {selected && !readOnly && (
        <button
          type="button"
          className="absolute bottom-0 right-0 z-40 flex size-4 cursor-nwse-resize items-center justify-center rounded-tl bg-[#62b5e8] text-[8px] font-bold text-[#0d1820]"
          onPointerDown={(event) => begin(event, "resize")}
          aria-label={`${block.label} skalieren`}
        >
          ↘
        </button>
      )}
    </div>
  );
}

function PageFooter({ projectTitle, pageNumber }) {
  return (
    <div className="absolute bottom-[2.2%] left-[4%] right-[4%] flex border-t border-[#d6d0c6] pt-[1%] text-[0.7cqw] uppercase tracking-[0.12em] text-[#6b7377]">
      <span>Projektunterlagen</span>
      <span className="mx-auto">{projectTitle}</span>
      <span>{String(pageNumber).padStart(2, "0")}</span>
    </div>
  );
}

function CoverPage({
  page,
  expose,
  photos,
  project,
  companySettings,
  editable,
  selectedBlockId,
  setSelectedBlockId,
  readOnly,
  snapTolerance,
  onLayoutChange,
  onTextChange,
  insertTool,
  onCreateCustomBlock,
  pageNumber
}) {
  const pageRef = useRef(null);
  const [guides, setGuides] = useState(null);
  const minimalTemplate = page.templateId === "minimal";
  const { draft, drawingProps } = useBlockDrawing({
    page,
    pageRef,
    insertTool: editable && !readOnly ? insertTool : null,
    snapTolerance,
    onCreate: onCreateCustomBlock
  });
  const fallbackProjectTitle = project?.title || project?.name || "Projekt";
  const projectTitle = getExposeCoverText(expose, "title", fallbackProjectTitle);
  const customerName = [project?.customer?.firstName, project?.customer?.lastName]
    .filter(Boolean)
    .join(" ");
  const blocks = [
    { id: "logo", label: "Unternehmenslogo", type: "image" },
    { id: "eyebrow", label: "Dokumenttyp", type: "text", text: getExposeCoverText(expose, "eyebrow", "PROJEKTMAPPE") },
    { id: "leftTitle", label: "Projekttitel links", type: "text", text: projectTitle },
    { id: "subtitle", label: "Unterzeile", type: "text", text: getExposeCoverText(expose, "subtitle", "Entwurf, Aufmaß und Fertigungsunterlagen") },
    { id: "status", label: "Status", type: "text", text: getExposeCoverText(expose, "status", "ENTWURF") },
    { id: "rightTitle", label: "Projekttitel", type: "text", text: projectTitle },
    { id: "customer", label: "Kunde", type: "generated", text: customerName },
    {
      id: "description",
      label: "Projektbeschreibung",
      type: "text",
      text: getExposeCoverText(expose, "description", project?.description || "Projektbeschreibung ergänzen …")
    },
    { id: "meta", label: "Projektdaten", type: "generated" }
  ];
  const layouts = blocks.map((block) => ({
    id: block.id,
    ...getExposeBlockLayout(expose, page.id, block.id, COVER_BLOCK_LAYOUTS[block.id])
  }));

  const content = (block, layout) => {
    if (block.id === "logo") {
      return companySettings?.branding?.logoDataUrl ? (
        <img src={companySettings.branding.logoDataUrl} alt="Unternehmenslogo" className="h-full w-full object-contain object-left" />
      ) : (
        <div className={`flex h-full items-center justify-center rounded border text-[0.8cqw] font-semibold uppercase tracking-[0.16em] ${minimalTemplate ? "border-[#9aa7ae] text-[#6b777d]" : "border-white/30 text-white/60"}`}>Unternehmenslogo</div>
      );
    }
    if (block.id === "meta") {
      return (
        <div className="flex h-full items-center justify-between border-t border-[#d6d0c6] text-[0.72cqw] uppercase tracking-[0.12em] text-[#6c7376]">
          <span>Datenstand {formatExposeDate(expose.cover.dataDate)}</span>
          <span>{expose.cover.projectNumber || "Projektmappe"}</span>
        </div>
      );
    }

    const textClass = {
      eyebrow: "text-[0.85cqw] font-bold uppercase tracking-[0.24em] text-[#d59e78]",
      leftTitle: `text-[2.75cqw] font-semibold leading-[1.05] ${minimalTemplate ? "text-[#19242b]" : "text-white"}`,
      subtitle: `text-[1.02cqw] leading-[1.35] ${minimalTemplate ? "text-[#60717a]" : "text-[#bdc8ce]"}`,
      status: "text-[0.8cqw] font-bold uppercase tracking-[0.2em] text-[#aa6239]",
      rightTitle: "text-[3.05cqw] font-semibold leading-[1.03] text-[#19242b]",
      customer: "text-[1.18cqw] font-medium text-[#5d696f]",
      description: "text-[1.08cqw] leading-[1.4] text-[#52636c]"
    }[block.id];
    const canEdit = block.type === "text" && editable && !readOnly;
    const textStyle = layout.fontSize != null
      ? { fontSize: fontSizeInCqw(layout.fontSize, page.width) }
      : undefined;
    return canEdit ? (
      <textarea
        data-expose-field
        value={block.text}
        onChange={(event) => onTextChange(block.id, event.target.value)}
        className={`h-full w-full resize-none overflow-hidden bg-transparent p-0 outline-none ${textClass}`}
        style={textStyle}
        aria-label={block.label}
      />
    ) : (
      <div className={`h-full whitespace-pre-wrap ${textClass}`} style={textStyle}>{block.text}</div>
    );
  };

  return (
    <div
      ref={pageRef}
      className={`relative h-full w-full overflow-hidden bg-white ${insertTool ? "cursor-crosshair" : ""}`}
      style={{ containerType: "inline-size" }}
      onClick={() => { if (!insertTool) setSelectedBlockId(null); }}
      {...drawingProps}
    >
      {!minimalTemplate && <div className="absolute inset-y-0 left-0 w-[37.7%] bg-[#172a36]" />}
      {!minimalTemplate && <div className="absolute inset-y-0 left-[37.7%] w-[0.75%] bg-[#b56437]" />}
      {blocks.map((block) => {
        const layout = layouts.find((item) => item.id === block.id);
        return (
          <EditableBlock
            key={block.id}
            page={page}
            block={block}
            layout={layout}
            allLayouts={layouts}
            selected={editable && selectedBlockId === block.id}
            readOnly={!editable || readOnly || block.type === "generated"}
            snapTolerance={snapTolerance}
            pageRef={pageRef}
            onSelect={setSelectedBlockId}
            onLayoutChange={(next) => onLayoutChange(block.id, next)}
            onGuidesChange={setGuides}
          >
            {content(block, layout)}
          </EditableBlock>
        );
      })}
      <CustomBlocks
        page={page}
        expose={expose}
        photos={photos}
        companySettings={companySettings}
        editable={editable}
        selectedBlockId={selectedBlockId}
        setSelectedBlockId={setSelectedBlockId}
        readOnly={readOnly}
        snapTolerance={snapTolerance}
        pageRef={pageRef}
        baseLayouts={layouts}
        onLayoutChange={onLayoutChange}
        onTextChange={onTextChange}
        onGuidesChange={setGuides}
      />
      <DrawingDraft page={page} draft={draft} />
      {guides?.x != null && <div className="pointer-events-none absolute inset-y-0 z-50 w-px bg-[#51b8f2]" style={{ left: `${guides.x / page.width * 100}%` }} />}
      {guides?.y != null && <div className="pointer-events-none absolute inset-x-0 z-50 h-px bg-[#51b8f2]" style={{ top: `${guides.y / page.height * 100}%` }} />}
      <PageFooter projectTitle={fallbackProjectTitle} pageNumber={pageNumber} />
    </div>
  );
}

function VisualPage({
  page,
  expose,
  photos,
  project,
  companySettings,
  editable,
  selectedBlockId,
  setSelectedBlockId,
  readOnly,
  snapTolerance,
  onLayoutChange,
  onTextChange,
  insertTool,
  onCreateCustomBlock,
  pageNumber
}) {
  const pageRef = useRef(null);
  const [guides, setGuides] = useState(null);
  const { draft, drawingProps } = useBlockDrawing({
    page,
    pageRef,
    insertTool: editable && !readOnly ? insertTool : null,
    snapTolerance,
    onCreate: onCreateCustomBlock
  });
  const copy = expose.assetText[page.assetId] ?? {};
  const title = Object.prototype.hasOwnProperty.call(copy, "title")
    ? String(copy.title ?? "")
    : page.defaultTitle;
  const body = Object.prototype.hasOwnProperty.call(copy, "text")
    ? String(copy.text ?? "")
    : page.fallbackBody;
  const blocks = [
    { id: "image", label: page.visualKind === "image" ? "Projektbild" : "Aufmaßansicht", type: "image" },
    { id: "title", label: "Seitentitel", type: "text", text: title },
    { id: "body", label: "Begleittext", type: "text", text: body }
  ];
  const templateLayouts = getVisualTemplateLayouts(page.templateId);
  const layouts = blocks.map((block) => ({
    id: block.id,
    ...getExposeBlockLayout(expose, page.id, block.id, templateLayouts[block.id])
  }));
  const overridePhoto = photos.find(
    (photo) => String(photo.id) === String(expose.imageOverrides?.[page.id])
  );
  const visualSource = overridePhoto?.url || page.source;

  return (
    <div
      ref={pageRef}
      className={`relative h-full w-full overflow-hidden bg-white text-[#1c2a32] ${insertTool ? "cursor-crosshair" : ""}`}
      style={{ containerType: "inline-size" }}
      onClick={() => { if (!insertTool) setSelectedBlockId(null); }}
      {...drawingProps}
    >
      <div className={`absolute left-[4%] top-[4.8%] text-[0.8cqw] font-bold uppercase tracking-[0.15em] ${page.templateId === "minimal" ? "text-[#65747b]" : "text-[#aa6239]"}`}>{page.section}</div>
      <div className="absolute left-[4%] top-[10.5%] text-[0.9cqw] text-[#6b767b]">{page.heading}</div>
      {page.templateId === "info" && <div className="absolute left-[75.4%] top-[17.6%] h-[75.2%] w-[0.7%] rounded-full bg-[#e4ddd1]" />}
      {page.templateId === "info-horizontal" && <div className="absolute left-[4%] right-[4%] top-[70.5%] h-[0.7%] rounded-full bg-[#e4ddd1]" />}
      {blocks.map((block) => {
        const layout = layouts.find((item) => item.id === block.id);
        let child;
        if (block.id === "image") {
          child = visualSource ? (
            <div className="h-full w-full overflow-hidden rounded-sm bg-white">
              <img
                src={visualSource}
                alt=""
                draggable="false"
                className="h-full w-full select-none object-contain"
                style={{
                  objectPosition: `${layout.cropX}% ${layout.cropY}%`,
                  transform: `scale(${layout.zoom})`,
                  transformOrigin: `${layout.cropX}% ${layout.cropY}%`
                }}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded border border-dashed border-[#9aa7ae] bg-white text-center text-[#77909e]">
              <div><AufmasIcon name={page.placeholderIcon || "image"} className="mx-auto size-[4cqw]" /><p className="mt-2 text-[0.9cqw] font-semibold">Ansicht wird beim Druck geladen</p></div>
            </div>
          );
        } else {
          const textClass = block.id === "title"
            ? "text-[1.55cqw] font-semibold leading-[1.12] text-[#1c2a32]"
            : "text-[0.9cqw] leading-[1.38] text-[#53656e]";
          const textStyle = layout.fontSize != null
            ? { fontSize: fontSizeInCqw(layout.fontSize, page.width) }
            : undefined;
          child = editable && !readOnly ? (
            <textarea
              data-expose-field
              value={block.text}
              onChange={(event) => onTextChange(block.id, event.target.value)}
              className={`h-full w-full resize-none overflow-hidden bg-transparent p-0 outline-none ${textClass}`}
              style={textStyle}
              aria-label={block.label}
            />
          ) : (
            <div className={`h-full whitespace-pre-wrap ${textClass}`} style={textStyle}>{block.text}</div>
          );
        }
        return (
          <EditableBlock
            key={block.id}
            page={page}
            block={block}
            layout={layout}
            allLayouts={layouts}
            selected={editable && selectedBlockId === block.id}
            readOnly={!editable || readOnly}
            snapTolerance={snapTolerance}
            pageRef={pageRef}
            onSelect={setSelectedBlockId}
            onLayoutChange={(next) => onLayoutChange(block.id, next)}
            onGuidesChange={setGuides}
          >
            {child}
          </EditableBlock>
        );
      })}
      <CustomBlocks
        page={page}
        expose={expose}
        photos={photos}
        companySettings={companySettings}
        editable={editable}
        selectedBlockId={selectedBlockId}
        setSelectedBlockId={setSelectedBlockId}
        readOnly={readOnly}
        snapTolerance={snapTolerance}
        pageRef={pageRef}
        baseLayouts={layouts}
        onLayoutChange={onLayoutChange}
        onTextChange={onTextChange}
        onGuidesChange={setGuides}
      />
      <DrawingDraft page={page} draft={draft} />
      {guides?.x != null && <div className="pointer-events-none absolute inset-y-0 z-50 w-px bg-[#51b8f2]" style={{ left: `${guides.x / page.width * 100}%` }} />}
      {guides?.y != null && <div className="pointer-events-none absolute inset-x-0 z-50 h-px bg-[#51b8f2]" style={{ top: `${guides.y / page.height * 100}%` }} />}
      <PageFooter projectTitle={expose.cover.title || project?.title || "Projekt"} pageNumber={pageNumber} />
    </div>
  );
}

function CabinetPage({ page, expose, project, materials, pageNumber }) {
  const minimalTemplate = page.templateId === "minimal";
  const contentStyle = page.templateId === "info"
    ? { left: "4%", top: "17%", width: "69%", height: "75%" }
    : page.templateId === "info-horizontal"
      ? { left: "4%", top: "17%", width: "92%", height: "51%" }
      : { left: "4%", top: "17%", width: "92%", height: "75%" };
  return (
    <div className="relative h-full w-full overflow-hidden bg-white p-[4%] text-[#1d2b33]" style={{ containerType: "inline-size" }}>
      <p className={`text-[0.8cqw] font-bold uppercase tracking-[0.15em] ${minimalTemplate ? "text-[#65747b]" : "text-[#aa6239]"}`}>{page.section}</p>
      <h3 className="mt-[1%] text-[2.25cqw] font-semibold">Korpusblätter</h3>
      <p className="mt-[0.6%] text-[0.85cqw] text-[#69757a]">{expose.text.cabinetIntro}</p>
      {page.templateId === "info" && <div className="absolute left-[75.4%] top-[17%] h-[76%] w-[0.7%] rounded-full bg-[#e4ddd1]" />}
      {page.templateId === "info-horizontal" && <div className="absolute left-[4%] right-[4%] top-[70.5%] h-[0.7%] rounded-full bg-[#e4ddd1]" />}
      <div className="absolute grid grid-cols-2 gap-[1%]" style={contentStyle}>
        {page.cabinets.map((cabinet, index) => {
          const information = getCabinetInformation(cabinet, materials);
          const functions = getCabinetFunctionLines(cabinet);
          return (
            <div key={cabinet.id ?? index} className="min-w-0 overflow-hidden rounded border border-[#ddd7cc] bg-white">
              <div className={`flex h-[13%] items-center gap-[4%] px-[3%] ${minimalTemplate ? "border-b border-[#ddd7cc] text-[#23343d]" : "bg-[#20323c] text-white"}`}>
                <span className="text-[0.75cqw] font-bold text-[#d5a276]">B{String(index + 1).padStart(2, "0")}</span>
                <p className="truncate text-[1.25cqw] font-semibold">{cabinet.name || `Korpus ${index + 1}`}</p>
              </div>
              <div className="grid h-[87%] grid-cols-[42%_1fr] gap-[3%] p-[3%]">
                <div aria-hidden="true" />
                <div className="flex min-h-0 min-w-0 flex-col">
                  <div className="grid grid-cols-2 gap-x-[4%] gap-y-[2%]">
                    {information.map(([label, value]) => (
                      <div key={label} className="min-w-0 border-b border-[#ece7df] pb-[2%]">
                        <p className="text-[0.48cqw] font-bold uppercase tracking-[0.08em] text-[#9a6b4d]">{label}</p>
                        <p className="mt-[1%] break-words text-[0.64cqw] leading-tight text-[#34464f]">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-[4%] min-h-0 flex-1 overflow-hidden rounded bg-[#f2eee7] p-[4%]">
                    <p className="text-[0.5cqw] font-bold uppercase tracking-[0.12em] text-[#8f5c3e]">Funktionen / Innenausbau</p>
                    <div className="mt-[2%] space-y-[1.5%] text-[0.58cqw] leading-tight text-[#4e5e66]">
                      {(functions.length ? functions : ["Keine Funktionen hinterlegt"]).map((line) => <p key={line}>• {line}</p>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <PageFooter projectTitle={expose.cover.title || project?.title || "Projekt"} pageNumber={pageNumber} />
    </div>
  );
}

function CncProgramGraphic({ program }) {
  const plotRef = useRef(null);
  const [plotSize, setPlotSize] = useState({ width: 0, height: 0 });
  const graphic = useMemo(
    () => createCncProgramSvg(program, { showDimensions: false }),
    [program]
  );

  useEffect(() => {
    const element = plotRef.current;
    if (!element) return undefined;
    const updateSize = () => setPlotSize({ width: element.clientWidth, height: element.clientHeight });
    updateSize();
    if (typeof globalThis.ResizeObserver !== "function") {
      globalThis.addEventListener?.("resize", updateSize);
      return () => globalThis.removeEventListener?.("resize", updateSize);
    }
    const observer = new globalThis.ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const sourceWidth = Math.max(1, Number(program.part.L) || graphic.width || 1);
  const sourceHeight = Math.max(1, Number(program.part.B) || graphic.height || 1);
  const scale = plotSize.width > 0 && plotSize.height > 0
    ? Math.min(plotSize.width / sourceWidth, plotSize.height / sourceHeight)
    : 0;
  const fitted = scale > 0
    ? {
        x: (plotSize.width - sourceWidth * scale) / 2,
        y: (plotSize.height - sourceHeight * scale) / 2,
        width: sourceWidth * scale,
        height: sourceHeight * scale
      }
    : null;

  return (
    <div className="relative mt-[0.5%] min-h-0 flex-1">
      <div ref={plotRef} className="absolute bottom-[2.8cqw] left-[3cqw] right-[0.5cqw] top-[0.3cqw]">
        {fitted ? (
          <>
            <img src={svgDataUrl(graphic.svg)} alt="" className="absolute select-none" style={{ left: fitted.x, top: fitted.y, width: fitted.width, height: fitted.height }} />
            <div className="absolute border-t border-[#17242b]" style={{ left: fitted.x, top: `calc(${fitted.y + fitted.height}px + 0.4cqw)`, width: fitted.width }}>
              <span className="absolute -top-[0.35cqw] left-0 h-[0.7cqw] border-l border-[#17242b]" />
              <span className="absolute -top-[0.35cqw] right-0 h-[0.7cqw] border-r border-[#17242b]" />
            </div>
            <span className="absolute whitespace-nowrap text-[0.62cqw] font-semibold text-[#17242b]" style={{ left: fitted.x + fitted.width / 2, top: `calc(${fitted.y + fitted.height}px + 0.75cqw)`, transform: "translateX(-50%)" }}>{program.part.L} mm</span>
            <div className="absolute border-l border-[#17242b]" style={{ left: `calc(${fitted.x}px - 0.45cqw)`, top: fitted.y, height: fitted.height }}>
              <span className="absolute -left-[0.35cqw] top-0 w-[0.7cqw] border-t border-[#17242b]" />
              <span className="absolute -left-[0.35cqw] bottom-0 w-[0.7cqw] border-b border-[#17242b]" />
            </div>
            <span className="absolute whitespace-nowrap text-[0.62cqw] font-semibold text-[#17242b]" style={{ left: `calc(${fitted.x}px - 1.15cqw)`, top: fitted.y + fitted.height / 2, transform: "translate(-50%, -50%) rotate(-90deg)" }}>{program.part.B} mm</span>
          </>
        ) : (
          <img src={svgDataUrl(graphic.svg)} alt="" className="h-full w-full object-contain" />
        )}
      </div>
    </div>
  );
}

function CncPage({ page, expose, project, pageNumber }) {
  const minimalTemplate = page.templateId === "minimal";
  const columns = page.programs.length <= 2 ? page.programs.length || 1 : 2;
  const contentStyle = page.templateId === "info"
    ? { left: "4%", top: "17%", width: "69%", height: "75%" }
    : page.templateId === "info-horizontal"
      ? { left: "4%", top: "17%", width: "92%", height: "51%" }
      : { left: "4%", top: "17%", width: "92%", height: "75%" };
  return (
    <div className="relative h-full w-full overflow-hidden bg-white p-[4%] text-[#1d2b33]" style={{ containerType: "inline-size" }}>
      <p className={`text-[0.8cqw] font-bold uppercase tracking-[0.15em] ${minimalTemplate ? "text-[#65747b]" : "text-[#aa6239]"}`}>{page.section}</p>
      <h3 className="mt-[1%] text-[2cqw] font-semibold">CNC-Programme</h3>
      <p className="mt-[0.6%] text-[0.85cqw] text-[#69757a]">Kompakte Linienansichten mit Außenmaßen und vorhandenen Bearbeitungen.</p>
      {page.templateId === "info" && <div className="absolute left-[75.4%] top-[17%] h-[76%] w-[0.7%] rounded-full bg-[#e4ddd1]" />}
      {page.templateId === "info-horizontal" && <div className="absolute left-[4%] right-[4%] top-[70.5%] h-[0.7%] rounded-full bg-[#e4ddd1]" />}
      <div className="absolute grid gap-[0.7%]" style={{ ...contentStyle, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {page.programs.map((program) => {
          return (
            <div key={program.id} className={`flex min-h-0 flex-col overflow-hidden rounded-sm border-[0.5px] border-[#ddd9d2] bg-white p-[1.2%] ${page.templateId === "minimal" ? "" : "shadow-[inset_0_2px_0_#d3a17c]"}`}>
              <div className="flex items-start justify-between gap-[3%]">
                <div className="min-w-0"><p className="truncate text-[0.85cqw] font-semibold">{program.label}</p><p className="mt-[1%] truncate text-[0.55cqw] text-[#758188]">{program.cabinetNames.join(", ") || "CNC-Programm"}</p></div>
                <span className="shrink-0 rounded bg-[#f1ede6] px-[2%] py-[1%] text-[0.5cqw] font-semibold text-[#78563f]">{program.quantity}×</span>
              </div>
              <CncProgramGraphic program={program} />
              <p className="mt-[1%] text-center text-[0.8cqw] font-semibold text-[#4f5f67]">{program.part.L} × {program.part.B} × {program.part.D ?? program.part.Staerke ?? "–"} mm · {(program.part.CNC?.operations ?? []).length} Bearbeitungen</p>
            </div>
          );
        })}
      </div>
      <PageFooter projectTitle={expose.cover.title || project?.title || "Projekt"} pageNumber={pageNumber} />
    </div>
  );
}

function ManualPage({ page, expose, project, pageNumber }) {
  const template = page.templateId ?? "title";
  const title = page.manual.title || page.label;
  const subtitle = page.manual.subtitle || "Projektunterlagen";
  return (
    <div className="relative h-full w-full overflow-hidden bg-white text-[#1b2a32]" style={{ containerType: "inline-size" }}>
      {template === "info" && <div className="absolute left-[75.4%] top-[17%] h-[76%] w-[0.7%] rounded-full bg-[#e4ddd1]" />}
      {template === "info-horizontal" && <div className="absolute left-[4%] right-[4%] top-[70.5%] h-[0.7%] rounded-full bg-[#e4ddd1]" />}
      <div className="absolute left-[4%] top-[5%] w-[88%]">
        <p className="text-[0.8cqw] font-bold uppercase tracking-[0.17em] text-[#aa6239]">{String(pageNumber).padStart(2, "0")} / {page.manual.eyebrow || "PROJEKTUNTERLAGEN"}</p>
        <p className="mt-[1%] whitespace-pre-wrap text-[0.9cqw] text-[#69757a]">{subtitle}</p>
      </div>
      {template === "title" && <h3 className="absolute left-[9%] top-[37%] w-[78%] whitespace-pre-wrap text-[3.4cqw] font-semibold leading-tight">{title}</h3>}
      <PageFooter projectTitle={expose.cover.title || project?.title || "Projekt"} pageNumber={pageNumber} />
    </div>
  );
}

function PartsPage({ page }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-white">
      <img src={page.source} alt={page.label} className="block max-h-full max-w-full object-contain object-center" draggable="false" />
    </div>
  );
}

function NestingPagePreview({ page, expose, project, pageNumber }) {
  const cutPage = page.cutPage ?? paginateNestingCuts(page.plan.cuts)[0];
  const maximumRows = Math.max(1, ...cutPage.columns.map((column) => column.length));
  const dense = maximumRows > 10;
  const cutItemHeight = Math.min(3.8, 34 / maximumRows);
  return (
    <div className="relative h-full w-full overflow-hidden bg-white p-[4%] text-[#1d2b33]" style={{ containerType: "inline-size" }}>
      <p className="text-[0.8cqw] font-bold uppercase tracking-[0.15em] text-[#aa6239]">{page.section}</p>
      <h3 className="mt-[1%] text-[2cqw] font-semibold">Nesting & Schnittplan</h3>
      <p className="mt-[0.6%] text-[0.85cqw] text-[#69757a]">{expose.text.nestingIntro}</p>
      <div className="mt-[2.5%] grid h-[70%] grid-cols-[25%_1fr] gap-[2%]">
        <div className="flex min-h-0 flex-col overflow-hidden rounded border border-[#e1dbd0] bg-[#f6f3ed] p-[5%]">
          <p className="text-[0.75cqw] font-bold uppercase tracking-[0.12em] text-[#aa6239]">Schnittfolge</p>
          <div className="mt-[3%] flex items-center justify-between gap-[3%]">
            <p className="text-[1.05cqw] font-semibold">Platte {page.plan.plateNumber}</p>
            <span className="rounded border border-[#d4cabd] bg-white px-[3%] py-[1%] text-[0.55cqw] font-semibold text-[#765a46]">Folge {cutPage.pageIndex + 1}/{cutPage.pageCount}</span>
          </div>
          <p className="mt-[2%] text-[0.55cqw] text-[#7a858a]">Schnitte {cutPage.startNumber || "–"}–{cutPage.endNumber || "–"} von {cutPage.totalCuts}</p>
          <div className={`mt-[4%] grid min-h-0 flex-1 gap-[3%] ${cutPage.columnCount === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {cutPage.columns.map((column, columnIndex) => (
              <div key={columnIndex} className="grid min-h-0 content-start gap-[2%]" style={{ gridTemplateRows: `repeat(${maximumRows}, minmax(0, ${cutItemHeight}cqw))` }}>
                {column.map((cut) => (
                  <div key={cut.number} className={`flex min-h-0 items-center gap-[4%] overflow-hidden rounded bg-white px-[4%] text-[0.68cqw] ${dense ? "py-[1%]" : "py-[3%]"}`}>
                    <span className="flex aspect-square w-[18%] shrink-0 items-center justify-center rounded-full bg-[#21313a] font-bold text-white">{cut.number}</span>
                    <span className="min-w-0 leading-tight">{cut.direction === "vertical" ? "V" : "H"} · {cut.position} mm{cut.stripId != null ? ` · ${cut.stripId}` : ""}<br /><span className="text-[#768187]">L {cut.length} mm</span></span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-[#bbb] bg-white p-[2%]"><img src={page.nestingSvg} alt="" className="h-full w-full object-contain" /></div>
      </div>
      <PageFooter projectTitle={expose.cover.title || project?.title || "Projekt"} pageNumber={pageNumber} />
    </div>
  );
}

function GeneratedPageEditor(props) {
  const {
    page,
    expose,
    photos,
    companySettings,
    editable,
    selectedBlockId,
    setSelectedBlockId,
    readOnly,
    snapTolerance,
    onLayoutChange,
    onTextChange,
    insertTool,
    onCreateCustomBlock,
    children
  } = props;
  const pageRef = useRef(null);
  const [guides, setGuides] = useState(null);
  const { draft, drawingProps } = useBlockDrawing({
    page,
    pageRef,
    insertTool: editable && !readOnly ? insertTool : null,
    snapTolerance,
    onCreate: onCreateCustomBlock
  });
  const cabinetBlocks = page.kind === "cabinet"
    ? page.cabinets.map((cabinet, index) => ({
        id: `cabinetImage:${index}`,
        label: `Korpusansicht ${index + 1}`,
        type: "cabinet-view",
        cabinet
      }))
    : [];
  const cabinetFallbacks = getCabinetImageLayouts(page.templateId, cabinetBlocks.length);
  const cabinetLayouts = cabinetBlocks.map((block, index) => ({
    id: block.id,
    ...getExposeBlockLayout(expose, page.id, block.id, cabinetFallbacks[index])
  }));
  const allLayouts = [
    ...cabinetLayouts,
    ...customBlocksForPage(expose, page.id).map((block) => ({ id: block.id, ...block.layout }))
  ];

  return (
    <div
      ref={pageRef}
      className={`relative h-full w-full overflow-hidden bg-white ${insertTool ? "cursor-crosshair" : ""}`}
      onClick={() => { if (!insertTool) setSelectedBlockId(null); }}
      {...drawingProps}
    >
      <div className="absolute inset-0">{children}</div>
      {cabinetBlocks.map((block, index) => {
        const layout = cabinetLayouts[index];
        const graphic = createCabinetSvg(block.cabinet);
        return (
          <EditableBlock
            key={block.id}
            page={page}
            block={block}
            layout={layout}
            allLayouts={allLayouts}
            selected={editable && selectedBlockId === block.id}
            readOnly={!editable || readOnly}
            snapTolerance={snapTolerance}
            pageRef={pageRef}
            onSelect={setSelectedBlockId}
            onLayoutChange={(next) => onLayoutChange(block.id, next)}
            onGuidesChange={setGuides}
          >
            <div className="h-full w-full bg-white">
              <img src={svgDataUrl(graphic.svg)} alt={block.label} draggable="false" className="h-full w-full select-none object-contain" />
            </div>
          </EditableBlock>
        );
      })}
      <CustomBlocks
        page={page}
        expose={expose}
        photos={photos}
        companySettings={companySettings}
        editable={editable}
        selectedBlockId={selectedBlockId}
        setSelectedBlockId={setSelectedBlockId}
        readOnly={readOnly}
        snapTolerance={snapTolerance}
        pageRef={pageRef}
        baseLayouts={cabinetLayouts}
        onLayoutChange={onLayoutChange}
        onTextChange={onTextChange}
        onGuidesChange={setGuides}
      />
      <DrawingDraft page={page} draft={draft} />
      {guides?.x != null && <div className="pointer-events-none absolute inset-y-0 z-50 w-px bg-[#51b8f2]" style={{ left: `${guides.x / page.width * 100}%` }} />}
      {guides?.y != null && <div className="pointer-events-none absolute inset-x-0 z-50 h-px bg-[#51b8f2]" style={{ top: `${guides.y / page.height * 100}%` }} />}
    </div>
  );
}

function PageCanvas(props) {
  const { page, expose, project, materials, pageNumber } = props;
  if (page.kind === "cover") return <CoverPage {...props} />;
  if (page.kind === "visual") return <VisualPage {...props} />;
  const content = page.kind === "cabinet"
    ? <CabinetPage page={page} expose={expose} project={project} materials={materials} pageNumber={pageNumber} />
    : page.kind === "parts"
      ? <PartsPage page={page} />
      : page.kind === "cnc"
        ? <CncPage page={page} expose={expose} project={project} pageNumber={pageNumber} />
        : page.kind === "manual"
          ? <ManualPage page={page} expose={expose} project={project} pageNumber={pageNumber} />
          : <NestingPagePreview page={page} expose={expose} project={project} pageNumber={pageNumber} />;
  return <GeneratedPageEditor {...props}>{content}</GeneratedPageEditor>;
}

function SectionSwitch({ label, checked, disabled, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px] text-[#9eafba] hover:bg-[#1c2932]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="size-3.5 accent-[#5f9cc4]" />
    </label>
  );
}

function PropertiesPanel({
  page,
  selectedBlock,
  layout,
  readOnly,
  insertTool,
  onInsertToolChange,
  onTemplateChange,
  onManualPageChange,
  onRemoveManualPage,
  onCncProgramsPerPageChange,
  onLayoutChange,
  onReset,
  onRemove,
  onChooseImage,
  textValue,
  onTextChange
}) {
  if (!page) {
    return (
      <aside className="flex h-full flex-col border-l border-[#2a3741] bg-[#172029] p-5 text-center">
        <div className="mx-auto mt-8 flex size-11 items-center justify-center rounded-full border border-[#344a57] bg-[#1d2b35] text-[#6f91a6]"><AufmasIcon name="plan" /></div>
        <p className="mt-3 text-sm font-semibold text-[#c3d0d8]">Gesamtansicht</p>
        <p className="mt-1 text-xs leading-relaxed text-[#687b88]">Klicke eine Seite an, um sie einzeln und ohne Scrollen zu bearbeiten.</p>
      </aside>
    );
  }

  if (!selectedBlock || !layout) {
    return (
      <aside className="flex h-full flex-col border-l border-[#2a3741] bg-[#172029]">
        <div className="border-b border-[#2a3741] px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#718391]">Seiteneigenschaften</p>
          <h3 className="mt-1 text-sm font-semibold text-[#e1eaf0]">{page.label}</h3>
        </div>
        <div className="space-y-4 p-4">
            {!['parts', 'nesting'].includes(page.kind) && <div className="rounded-lg border border-[#31434e] bg-[#111a21] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8395a1]">Vorlagenmanager</p>
              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6f828e]">
                Seitenvorlage
                <select value={page.templateId ?? "info"} disabled={readOnly} onChange={(event) => onTemplateChange(event.target.value)} className={`${POSITION_INPUT} normal-case tracking-normal`}>
                  <option value="info">Info · vertikal</option>
                  <option value="info-horizontal">Info · horizontal</option>
                  <option value="minimal">Minimal · Weiß</option>
                  {page.kind === 'cabinet' && <option value="cabinet-standard">Standard · farbig</option>}
                  {['manual', 'cover'].includes(page.kind) && <option value="title">Titel</option>}
                </select>
              </label>
              {page.kind === "cnc" && (
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6f828e]">
                  CNC-Programme pro Seite
                  <select value={page.programsPerPage ?? ""} disabled={readOnly} onChange={(event) => onCncProgramsPerPageChange(Number(event.target.value))} className={`${POSITION_INPUT} normal-case tracking-normal`}>
                    {[1, 2, 4, 6, 8].map((count) => <option key={count} value={count}>{count} Programme</option>)}
                  </select>
                </label>
              )}
              {page.kind === "manual" && (
                <div className="mt-3 space-y-2">
                  {[
                    ["label", "Seitenname"],
                    ["eyebrow", "Seitendefinition"],
                    ...(page.templateId === "title" ? [["title", "Titel"]] : []),
                    ["subtitle", "Unterüberschrift"]
                  ].map(([key, label]) => (
                    <label key={key} className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6f828e]">
                      {label}
                      {key === "subtitle" ? (
                        <textarea value={page.manual[key] ?? ""} disabled={readOnly} onChange={(event) => onManualPageChange({ [key]: event.target.value })} rows="3" className={`${POSITION_INPUT} resize-y normal-case tracking-normal`} />
                      ) : (
                        <input value={page.manual[key] ?? ""} disabled={readOnly} onChange={(event) => onManualPageChange({ [key]: event.target.value })} className={`${POSITION_INPUT} normal-case tracking-normal`} />
                      )}
                    </label>
                  ))}
                  <button type="button" disabled={readOnly} onClick={onRemoveManualPage} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#704744] px-3 py-2 text-xs font-semibold text-[#e2aaa5] hover:bg-[#321f20] disabled:opacity-40"><AufmasIcon name="trash" className="size-4" /> Seite entfernen</button>
                </div>
              )}
            </div>}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#748591]">Werkzeuge</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#718491]">Werkzeug wählen und den neuen Bereich direkt auf der A4-Seite aufziehen.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["text", "edit", "Textfeld"],
                ["image", "image", "Bild"],
                ["logo", "photo", "Logo"]
              ].map(([id, icon, label]) => (
                <button
                  key={id}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onInsertToolChange(insertTool === id ? null : id)}
                  className={`flex min-w-0 flex-col items-center gap-1.5 rounded-md border px-1 py-3 text-[10px] font-semibold transition disabled:opacity-40 ${insertTool === id ? "border-[#62b5e8] bg-[#26485c] text-white" : "border-[#344651] bg-[#10181f] text-[#a9bac5] hover:border-[#52758a] hover:bg-[#1e303b]"}`}
                  aria-pressed={insertTool === id}
                >
                  <AufmasIcon name={icon} className="size-4" />
                  {label}
                </button>
              ))}
            </div>
            {insertTool && <p className="rounded-md border border-[#42667b] bg-[#1c3340] px-3 py-2 text-[10px] leading-relaxed text-[#b9d8e8]">Auf der Seite ziehen oder klicken, um {customBlockLabel(insertTool)} einzufügen. Erneutes Anklicken bricht ab.</p>}
        </div>
      </aside>
    );
  }

  const updateNumber = (key, value) => {
    const parsed = Number.parseFloat(String(value).replace(",", "."));
    if (Number.isFinite(parsed)) onLayoutChange({ ...layout, [key]: parsed });
  };
  const selectedFontSize = clamp(Number(layout.fontSize ?? selectedBlock.defaultFontSize) || 9, 5, 36);
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-[#2a3741] bg-[#172029]">
      <div className="border-b border-[#2a3741] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#718391]">Ausgewähltes Objekt</p>
        <h3 className="mt-1 text-sm font-semibold text-[#e1eaf0]">{selectedBlock.label}</h3>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {[["x", "X"], ["y", "Y"], ["width", "Breite"], ["height", "Höhe"]].map(([key, label]) => (
            <label key={key} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
              {label} · mm
              <input type="number" step="0.5" value={Math.round(layout[key] * 10) / 10} disabled={readOnly} onChange={(event) => updateNumber(key, event.target.value)} className={POSITION_INPUT} />
            </label>
          ))}
        </div>
        {selectedBlock.type === "image" && layout.cropX != null && (
          <div className="space-y-3 border-t border-[#2a3741] pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#748591]">Bildausschnitt</p>
            {[["zoom", "Vergrößerung", 1, 4, 0.05], ["cropX", "Ausschnitt horizontal", 0, 100, 1], ["cropY", "Ausschnitt vertikal", 0, 100, 1]].map(([key, label, min, max, step]) => (
              <label key={key} className="block text-[10px] text-[#82939f]">
                <span className="flex justify-between"><span>{label}</span><span>{key === "zoom" ? `${Math.round(layout[key] * 100)} %` : `${Math.round(layout[key])} %`}</span></span>
                <input type="range" min={min} max={max} step={step} value={layout[key]} disabled={readOnly} onChange={(event) => updateNumber(key, event.target.value)} className="mt-2 w-full accent-[#5f9cc4]" />
              </label>
            ))}
          </div>
        )}
        {selectedBlock.type === "image" && (
          <button type="button" disabled={readOnly} onClick={onChooseImage} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#47718a] bg-[#203b4b] px-3 py-2.5 text-xs font-semibold text-[#d4e9f4] hover:bg-[#294b5f] disabled:opacity-40">
            <AufmasIcon name="image" className="size-4" /> Bild aus Projektbildern wählen
          </button>
        )}
        {selectedBlock.type === "text" && (
          <div className="space-y-4 border-t border-[#2a3741] pt-4">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
              <span className="flex items-center justify-between"><span>Schriftgröße</span><span>{selectedFontSize} pt</span></span>
              <input aria-label="Schriftgröße" type="range" min="5" max="36" step="0.5" value={selectedFontSize} disabled={readOnly} onChange={(event) => updateNumber("fontSize", event.target.value)} className="mt-2 w-full accent-[#5f9cc4]" />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
              Text
              <textarea rows="7" value={textValue} disabled={readOnly} onChange={(event) => onTextChange(event.target.value)} className={`${POSITION_INPUT} resize-y normal-case leading-relaxed tracking-normal`} />
            </label>
          </div>
        )}
        <button type="button" disabled={readOnly} onClick={onReset} className="w-full rounded-md border border-[#3a4c57] px-3 py-2 text-xs font-semibold text-[#aab9c3] hover:bg-[#202e37] disabled:opacity-40">Position und Größe zurücksetzen</button>
        {selectedBlock.custom && (
          <button type="button" disabled={readOnly} onClick={onRemove} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#704744] px-3 py-2 text-xs font-semibold text-[#e2aaa5] hover:bg-[#321f20] disabled:opacity-40">
            <AufmasIcon name="trash" className="size-4" /> Objekt entfernen
          </button>
        )}
        <p className="text-[10px] leading-relaxed text-[#5f727e]">Blöcke rasten am 5-mm-Raster, an Seitenrändern und an anderen Objekten ein. Die Fangweite kommt aus den Line-Lock-Einstellungen des Aufmaßes; Alt deaktiviert Snapping kurzzeitig.</p>
      </div>
    </aside>
  );
}

export default function ExposeView({
  value,
  onChange,
  project,
  photos,
  views,
  pdfPages = {},
  objects = [],
  dxfLayers = {},
  cabinets = [],
  partsList = [],
  partsListPdfPages = [],
  nesting = [],
  materials = [],
  companySettings,
  readOnly = false,
  saveStatus = "saved",
  onPrint,
  printing = false,
  onRequestImage,
  focusPageId = null,
  focusBlockId = null,
  lineLockThresholdCm = 5,
  measurementLabelOffsetY = -30
}) {
  const expose = normalizeExpose(value);
  const [activePageId, setActivePageId] = useState(focusPageId);
  const [selectedBlockId, setSelectedBlockId] = useState(focusBlockId);
  const [insertTool, setInsertTool] = useState(null);
  const [draggedPageId, setDraggedPageId] = useState(null);
  const draggedPageIdRef = useRef(null);
  const [pageZoom, setPageZoom] = useState(1);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 900, height: 620 });
  const workspaceRef = useRef(null);
  const pages = useMemo(
    () => createExposePages({
      expose,
      project,
      photos,
      views,
      pdfPages,
      objects,
      dxfLayers,
      cabinets,
      partsList,
      partsListPdfPages,
      nesting,
      measurementLabelOffsetY
    }),
    [cabinets, dxfLayers, expose, measurementLabelOffsetY, nesting, objects, partsList, partsListPdfPages, pdfPages, photos, project, views]
  );
  const activePage = pages.find((page) => page.id === activePageId) ?? null;
  const snapTolerance = clamp((Number(lineLockThresholdCm) || 0) * 10, 0, 50);
  const basePageWidth = (activePage?.width ?? PAGE_WIDTH) * PAGE_RENDER_SCALE;
  const basePageHeight = (activePage?.height ?? PAGE_HEIGHT) * PAGE_RENDER_SCALE;
  const fitScale = activePage
    ? Math.max(0.05, Math.min(
        (workspaceSize.width - 40) / basePageWidth,
        (workspaceSize.height - 40) / basePageHeight
      ))
    : 1;
  const displayScale = fitScale * pageZoom;
  const scaledPageWidth = basePageWidth * displayScale;
  const scaledPageHeight = basePageHeight * displayScale;

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return undefined;
    const updateSize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (width > 0 && height > 0) setWorkspaceSize({ width, height });
    };
    updateSize();
    if (typeof globalThis.ResizeObserver === "function") {
      const observer = new globalThis.ResizeObserver(updateSize);
      observer.observe(element);
      return () => observer.disconnect();
    }
    globalThis.addEventListener?.("resize", updateSize);
    return () => globalThis.removeEventListener?.("resize", updateSize);
  }, [activePageId]);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element || !activePageId) return undefined;
    const zoomWithWheel = (event) => {
      const mouseWheelStep = event.deltaMode !== 0 || Math.abs(event.wheelDeltaY ?? 0) >= 100;
      const mostlyVerticalLargeStep = Math.abs(event.deltaY) >= 50 && Math.abs(event.deltaX) < 10;
      const shouldZoom = event.ctrlKey || event.metaKey || mouseWheelStep || mostlyVerticalLargeStep;
      if (!shouldZoom) return;
      event.preventDefault();
      event.stopPropagation();
      const direction = event.deltaY > 0 ? -1 : 1;
      setPageZoom((current) => clamp(current + direction * 0.1, 0.25, 2.5));
    };
    element.addEventListener("wheel", zoomWithWheel, { passive: false });
    return () => element.removeEventListener("wheel", zoomWithWheel);
  }, [activePageId]);

  const updateExpose = (patch) => onChange({ ...expose, ...patch, version: 2 });
  const updateSection = (id, enabled) => updateExpose({
    sections: { ...expose.sections, [id]: enabled }
  });
  const pageEnabled = (page) =>
    page.defaultEnabled !== false && !expose.disabledPageIds.includes(page.id);
  const togglePage = (page, enabled) => {
    const disabled = new Set(expose.disabledPageIds);
    if (enabled) disabled.delete(page.id);
    else disabled.add(page.id);
    const patch = { disabledPageIds: [...disabled] };
    if (enabled && page.defaultEnabled === false) {
      const selectionKey = page.visualKind === "image" ? "selectedImageIds" : "selectedViewIds";
      patch[selectionKey] = [...new Set([...expose[selectionKey], page.assetId])];
    }
    updateExpose(patch);
  };

  const updateBlockLayout = (pageId, blockId, layout) => {
    const customBlocks = customBlocksForPage(expose, pageId);
    if (customBlocks.some((block) => block.id === blockId)) {
      updateExpose({
        customBlocks: {
          ...expose.customBlocks,
          [pageId]: customBlocks.map((block) => block.id === blockId ? { ...block, layout } : block)
        }
      });
      return;
    }
    const pageLayout = expose.pageLayouts[pageId] ?? {};
    updateExpose({
      pageLayouts: {
        ...expose.pageLayouts,
        [pageId]: {
          ...pageLayout,
          blocks: {
            ...(pageLayout.blocks ?? {}),
            [blockId]: layout
          }
        }
      }
    });
  };

  const resetBlockLayout = (pageId, blockId) => {
    const customBlocks = customBlocksForPage(expose, pageId);
    const customBlock = customBlocks.find((block) => block.id === blockId);
    if (customBlock) {
      updateExpose({
        customBlocks: {
          ...expose.customBlocks,
          [pageId]: customBlocks.map((block) => block.id === blockId
            ? { ...block, layout: { ...(block.defaultLayout ?? block.layout) } }
            : block)
        }
      });
      return;
    }
    const pageLayout = expose.pageLayouts[pageId];
    if (!pageLayout?.blocks?.[blockId]) return;
    const blocks = { ...pageLayout.blocks };
    delete blocks[blockId];
    updateExpose({
      pageLayouts: {
        ...expose.pageLayouts,
        [pageId]: { ...pageLayout, blocks }
      }
    });
  };

  const updateBlockText = (page, blockId, text) => {
    const customBlocks = customBlocksForPage(expose, page.id);
    if (customBlocks.some((block) => block.id === blockId)) {
      updateExpose({
        customBlocks: {
          ...expose.customBlocks,
          [page.id]: customBlocks.map((block) => block.id === blockId ? { ...block, text } : block)
        }
      });
      return;
    }
    if (page.kind === "cover") {
      const key = {
        eyebrow: "eyebrow",
        leftTitle: "title",
        rightTitle: "title",
        subtitle: "subtitle",
        status: "status",
        description: "description"
      }[blockId];
      if (key) updateExpose({
        cover: { ...expose.cover, [key]: text },
        coverTextOverrides: { ...expose.coverTextOverrides, [key]: text }
      });
      return;
    }
    if (page.kind === "visual") {
      const current = expose.assetText[page.assetId] ?? {};
      updateExpose({
        assetText: {
          ...expose.assetText,
          [page.assetId]: {
            ...current,
            [blockId === "title" ? "title" : "text"]: text
          }
        }
      });
    }
  };

  const createCustomBlock = (page, type, layout) => {
    const id = `custom:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    const blockLayout = type === "text" ? { ...layout, fontSize: 9 } : layout;
    const block = {
      id,
      type,
      text: type === "text" ? "" : undefined,
      imageId: null,
      layout: blockLayout,
      defaultLayout: blockLayout
    };
    updateExpose({
      customBlocks: {
        ...expose.customBlocks,
        [page.id]: [...customBlocksForPage(expose, page.id), block]
      }
    });
    setSelectedBlockId(id);
    setInsertTool(null);
  };

  const removeCustomBlock = (pageId, blockId) => {
    updateExpose({
      customBlocks: {
        ...expose.customBlocks,
        [pageId]: customBlocksForPage(expose, pageId).filter((block) => block.id !== blockId)
      }
    });
    setSelectedBlockId(null);
  };

  const updatePageTemplate = (pageId, templateId) => {
    const pageLayouts = { ...expose.pageLayouts };
    delete pageLayouts[pageId];
    updateExpose({
      pageTemplates: { ...expose.pageTemplates, [pageId]: templateId },
      manualPages: expose.manualPages.map((page) => page.id === pageId ? { ...page, templateId } : page),
      pageLayouts
    });
  };

  const updateManualPage = (pageId, patch) => updateExpose({
    manualPages: expose.manualPages.map((page) => page.id === pageId ? { ...page, ...patch } : page)
  });

  const addManualPage = () => {
    const id = `manual:${globalThis.crypto.randomUUID()}`;
    const afterPageId = activePage?.id ?? pages.at(-1)?.id ?? "cover";
    const pageOrder = pages.map((page) => page.id);
    pageOrder.splice(Math.max(0, pageOrder.indexOf(afterPageId) + 1), 0, id);
    updateExpose({
      manualPages: [...expose.manualPages, {
        id,
        afterPageId,
        label: "Neue Zwischenseite",
        eyebrow: "PROJEKTUNTERLAGEN",
        title: "Zwischentitel",
        subtitle: "Inhalt und Beschreibung ergänzen",
        templateId: "title"
      }],
      pageTemplates: { ...expose.pageTemplates, [id]: "title" },
      pageOrder
    });
    setActivePageId(id);
    setSelectedBlockId(null);
    setInsertTool(null);
  };

  const removeManualPage = (pageId) => {
    const page = expose.manualPages.find((item) => item.id === pageId);
    const fallbackId = page?.afterPageId ?? "cover";
    const pageTemplates = { ...expose.pageTemplates };
    const customBlocks = { ...expose.customBlocks };
    delete pageTemplates[pageId];
    delete customBlocks[pageId];
    updateExpose({
      manualPages: expose.manualPages
        .filter((item) => item.id !== pageId)
        .map((item) => item.afterPageId === pageId ? { ...item, afterPageId: fallbackId } : item),
      pageTemplates,
      customBlocks,
      pageOrder: expose.pageOrder.filter((id) => id !== pageId)
    });
    setActivePageId(fallbackId);
    setSelectedBlockId(null);
  };

  const reorderPages = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    const order = pages.map((page) => page.id).filter((pageId) => pageId !== sourceId);
    const targetIndex = order.indexOf(targetId);
    order.splice(targetIndex < 0 ? order.length : targetIndex, 0, sourceId);
    updateExpose({ pageOrder: order });
  };

  const selectedCustomBlock = activePage
    ? customBlocksForPage(expose, activePage.id).find((block) => block.id === selectedBlockId)
    : null;

  const builtInBlockDefinition = activePage?.kind === "cover"
    ? {
        logo: { id: "logo", label: "Unternehmenslogo", type: "logo", fallback: COVER_BLOCK_LAYOUTS.logo },
        eyebrow: { id: "eyebrow", label: "Dokumenttyp", type: "text", defaultFontSize: COVER_TEXT_FONT_SIZES.eyebrow, fallback: COVER_BLOCK_LAYOUTS.eyebrow },
        leftTitle: { id: "leftTitle", label: "Projekttitel links", type: "text", defaultFontSize: COVER_TEXT_FONT_SIZES.leftTitle, fallback: COVER_BLOCK_LAYOUTS.leftTitle },
        subtitle: { id: "subtitle", label: "Unterzeile", type: "text", defaultFontSize: COVER_TEXT_FONT_SIZES.subtitle, fallback: COVER_BLOCK_LAYOUTS.subtitle },
        status: { id: "status", label: "Status", type: "text", defaultFontSize: COVER_TEXT_FONT_SIZES.status, fallback: COVER_BLOCK_LAYOUTS.status },
        rightTitle: { id: "rightTitle", label: "Projekttitel", type: "text", defaultFontSize: COVER_TEXT_FONT_SIZES.rightTitle, fallback: COVER_BLOCK_LAYOUTS.rightTitle },
        customer: { id: "customer", label: "Kunde", type: "generated", fallback: COVER_BLOCK_LAYOUTS.customer },
        description: { id: "description", label: "Projektbeschreibung", type: "text", defaultFontSize: COVER_TEXT_FONT_SIZES.description, fallback: COVER_BLOCK_LAYOUTS.description },
        meta: { id: "meta", label: "Projektdaten", type: "generated", fallback: COVER_BLOCK_LAYOUTS.meta }
      }[selectedBlockId]
    : activePage?.kind === "visual"
      ? {
          image: { id: "image", label: activePage.visualKind === "image" ? "Projektbild" : "Aufmaßansicht", type: "image", fallback: getVisualTemplateLayouts(activePage.templateId).image },
          title: { id: "title", label: "Seitentitel", type: "text", defaultFontSize: VISUAL_TEXT_FONT_SIZES.title, fallback: getVisualTemplateLayouts(activePage.templateId).title },
          body: { id: "body", label: "Begleittext", type: "text", defaultFontSize: VISUAL_TEXT_FONT_SIZES.body, fallback: getVisualTemplateLayouts(activePage.templateId).body }
        }[selectedBlockId]
      : activePage?.kind === "cabinet"
        ? activePage.cabinets.map((cabinet, index) => ({
            id: `cabinetImage:${index}`,
            label: `Korpusansicht ${index + 1}`,
            type: "cabinet-view",
            fallback: getCabinetImageLayouts(activePage.templateId, activePage.cabinets.length)[index],
            cabinet
          })).find((block) => block.id === selectedBlockId) ?? null
        : null;
  const blockDefinition = selectedCustomBlock
    ? {
        id: selectedCustomBlock.id,
        label: customBlockLabel(selectedCustomBlock.type),
        type: selectedCustomBlock.type === "logo" ? "logo" : selectedCustomBlock.type,
        defaultFontSize: selectedCustomBlock.type === "text" ? 9 : undefined,
        custom: true
      }
    : builtInBlockDefinition;
  const selectedLayout = activePage && blockDefinition
    ? selectedCustomBlock?.layout ?? getExposeBlockLayout(expose, activePage.id, blockDefinition.id, blockDefinition.fallback)
    : null;
  const selectedText = !blockDefinition || blockDefinition.type !== "text"
    ? ""
    : selectedCustomBlock
      ? String(selectedCustomBlock.text ?? "")
    : activePage.kind === "cover"
      ? ({
          eyebrow: getExposeCoverText(expose, "eyebrow", "PROJEKTMAPPE"),
          leftTitle: getExposeCoverText(expose, "title", project?.title || project?.name || ""),
          rightTitle: getExposeCoverText(expose, "title", project?.title || project?.name || ""),
          subtitle: getExposeCoverText(expose, "subtitle", "Entwurf, Aufmaß und Fertigungsunterlagen"),
          status: getExposeCoverText(expose, "status", "ENTWURF"),
          description: getExposeCoverText(expose, "description", project?.description || "")
        }[blockDefinition.id] ?? "")
      : blockDefinition.id === "title"
        ? Object.prototype.hasOwnProperty.call(expose.assetText[activePage.assetId] ?? {}, "title")
          ? String(expose.assetText[activePage.assetId].title ?? "")
          : activePage.defaultTitle
        : Object.prototype.hasOwnProperty.call(expose.assetText[activePage.assetId] ?? {}, "text")
          ? String(expose.assetText[activePage.assetId].text ?? "")
          : activePage.fallbackBody;

  const saveLabel = saveStatus === "saving"
    ? "Wird gespeichert …"
    : saveStatus === "error"
      ? "Speichern fehlgeschlagen"
      : saveStatus === "local"
        ? "Lokal gespeichert"
        : "Automatisch gespeichert";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0c1217]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#2a3741] bg-[#152029] px-4">
        <div>
          <div className="flex items-center gap-2"><AufmasIcon name="plan" className="size-4 text-[#79b6dc]" /><h2 className="text-sm font-semibold text-[#e5edf3]">Exposé-Druckeditor</h2></div>
          <p className="mt-0.5 text-[10px] text-[#6f818e]">{activePage ? `${activePage.label} · Einzelansicht` : `${pages.length} Seiten · Gesamtansicht`}</p>
        </div>
        <div className="flex items-center gap-2">
          {activePage && (
            <div className="flex items-center rounded-md border border-[#344957] bg-[#101920] p-0.5" role="group" aria-label="Seitenzoom">
              <button type="button" onClick={() => setPageZoom((current) => clamp(current - 0.25, 0.25, 2.5))} className="flex size-7 items-center justify-center rounded text-[#9eb3c0] hover:bg-[#223541] hover:text-white" aria-label="Seite verkleinern"><AufmasIcon name="zoomOut" className="size-3.5" /></button>
              <span className="w-12 text-center text-[10px] tabular-nums text-[#b8c7d0]">{Math.round(pageZoom * 100)} %</span>
              <button type="button" onClick={() => setPageZoom((current) => clamp(current + 0.25, 0.25, 2.5))} className="flex size-7 items-center justify-center rounded text-[#9eb3c0] hover:bg-[#223541] hover:text-white" aria-label="Seite vergrößern"><AufmasIcon name="zoomIn" className="size-3.5" /></button>
              <button type="button" onClick={() => setPageZoom(1)} className="ml-0.5 flex size-7 items-center justify-center rounded border-l border-[#344957] text-[#9eb3c0] hover:bg-[#223541] hover:text-white" aria-label="Seite einpassen" title="A4-Seite einpassen"><AufmasIcon name="fit" className="size-3.5" /></button>
            </div>
          )}
          <span className={`rounded-md border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${saveStatus === "error" ? "border-[#70413f] bg-[#2d1c1d] text-[#f0aaa6]" : "border-[#34566b] bg-[#1d3442] text-[#acd5eb]"}`}>{saveLabel}</span>
          <button type="button" onClick={onPrint} disabled={printing} className="inline-flex items-center gap-2 rounded-md border border-[#466a7f] bg-[#234052] px-3 py-1.5 text-[11px] font-semibold text-[#d6ebf6] hover:bg-[#2d5268] disabled:opacity-50" title="Exposé als PDF drucken">
            <AufmasIcon name="print" className="size-4" /> {printing ? "PDF wird erstellt …" : "Drucken"}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[184px_minmax(0,1fr)_292px]">
        <aside className="min-h-0 overflow-y-auto border-r border-[#2a3741] bg-[#141e26] p-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#718391]">Seiten</p>
            <button type="button" onClick={addManualPage} disabled={readOnly} className="inline-flex items-center gap-1 rounded border border-[#3b5667] bg-[#1d303b] px-2 py-1 text-[9px] font-semibold text-[#bcd6e4] hover:bg-[#274454] disabled:opacity-40" title="Neue Seite nach der aktiven Seite einfügen"><AufmasIcon name="plus" className="size-3" /> Seite</button>
          </div>
          <div className="mt-2 space-y-1">
            {pages.map((page, index) => (
              <div
                key={page.id}
                draggable={!readOnly}
                onDragStart={(event) => {
                  draggedPageIdRef.current = page.id;
                  setDraggedPageId(page.id);
                  event.dataTransfer?.setData("text/plain", page.id);
                  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => { if (!readOnly) event.preventDefault(); }}
                onDrop={(event) => {
                  event.preventDefault();
                  reorderPages(draggedPageIdRef.current || draggedPageId || event.dataTransfer?.getData("text/plain"), page.id);
                  draggedPageIdRef.current = null;
                  setDraggedPageId(null);
                }}
                onDragEnd={() => { draggedPageIdRef.current = null; setDraggedPageId(null); }}
                className={draggedPageId === page.id ? "opacity-45" : ""}
              >
                <button type="button" onClick={() => { setActivePageId(page.id); setSelectedBlockId(null); setInsertTool(null); }} className={`flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-[10px] ${activePageId === page.id ? "border-[#5687a6] bg-[#223846] text-white" : "border-transparent text-[#91a3af] hover:bg-[#1c2932]"}`}>
                  <span className="cursor-grab text-[11px] tracking-[-0.2em] text-[#536a78]" title="Seite verschieben">⠿</span>
                  <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#0f171d] text-[9px] tabular-nums text-[#718491]">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{page.label}</span>
                  {page.optional && <span className={`size-1.5 rounded-full ${pageEnabled(page) ? "bg-[#5daf91]" : "bg-[#6a4b4b]"}`} />}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-[#2a3741] pt-3">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#718391]">Druckbereiche</p>
            <div className="mt-1">
              <SectionSwitch label="Perspektiven" checked={expose.sections.perspectives !== false} disabled={readOnly} onChange={(value) => updateSection("perspectives", value)} />
              <SectionSwitch label="Aufmaßansichten" checked={expose.sections.measurement !== false} disabled={readOnly} onChange={(value) => updateSection("measurement", value)} />
              <SectionSwitch label="Korpusblätter" checked={expose.sections.cabinets !== false} disabled={readOnly} onChange={(value) => updateSection("cabinets", value)} />
              <SectionSwitch label="Zuschnittliste" checked={expose.sections.partsList !== false} disabled={readOnly} onChange={(value) => updateSection("partsList", value)} />
              <SectionSwitch label="CNC" checked={expose.sections.cnc !== false} disabled={readOnly} onChange={(value) => updateSection("cnc", value)} />
              <SectionSwitch label="Nesting" checked={expose.sections.nesting !== false} disabled={readOnly} onChange={(value) => updateSection("nesting", value)} />
            </div>
          </div>
        </aside>

        <main
          ref={workspaceRef}
          className={`min-h-0 ${activePage ? "overflow-auto" : "overflow-y-auto"} bg-[#090e12] p-5`}
          aria-label="Exposé-Arbeitsfläche"
        >
          {activePage ? (
            <div
              className="relative flex items-center justify-center"
              aria-label="Bereich neben der A4-Seite"
              style={{
                width: Math.max(workspaceSize.width - 40, scaledPageWidth + 32),
                height: Math.max(workspaceSize.height - 40, scaledPageHeight + 32),
                minWidth: "100%",
                minHeight: "100%"
              }}
              onPointerDown={(event) => { if (event.target === event.currentTarget) { setActivePageId(null); setSelectedBlockId(null); setInsertTool(null); } }}
            >
              <div
                className="relative shrink-0 shadow-[0_18px_70px_rgba(0,0,0,.55)]"
                aria-label={`${activePage.label} · A4-Seite`}
                data-page-width-mm={activePage.width}
                data-page-height-mm={activePage.height}
                style={{
                  width: scaledPageWidth,
                  height: scaledPageHeight
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <div
                  className="absolute left-0 top-0 overflow-hidden bg-white"
                  style={{
                    width: basePageWidth,
                    height: basePageHeight,
                    transform: `scale(${displayScale})`,
                    transformOrigin: "top left"
                  }}
                >
                  <PageCanvas
                    page={activePage}
                    expose={expose}
                    project={project}
                    photos={photos}
                    materials={materials}
                    companySettings={companySettings}
                    editable
                    selectedBlockId={selectedBlockId}
                    setSelectedBlockId={setSelectedBlockId}
                    readOnly={readOnly}
                    snapTolerance={snapTolerance}
                    onLayoutChange={(blockId, layout) => updateBlockLayout(activePage.id, blockId, layout)}
                    onTextChange={(blockId, text) => updateBlockText(activePage, blockId, text)}
                    insertTool={insertTool}
                    onCreateCustomBlock={(type, layout) => createCustomBlock(activePage, type, layout)}
                    pageNumber={pages.indexOf(activePage) + 1}
                  />
                  {activePage.optional && (
                    <label data-expose-ui className="absolute right-3 top-3 z-[60] flex cursor-pointer items-center gap-2 rounded-md border border-black/20 bg-white/95 px-2.5 py-1.5 text-[10px] font-semibold text-[#27343b] shadow">
                      <input type="checkbox" checked={pageEnabled(activePage)} disabled={readOnly} onChange={(event) => togglePage(activePage, event.target.checked)} className="size-3.5 accent-[#39779c]" /> Im Druck verwenden
                    </label>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-5 xl:grid-cols-2">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`group relative overflow-hidden text-left shadow-[0_14px_45px_rgba(0,0,0,.42)] transition hover:-translate-y-0.5 hover:ring-2 hover:ring-[#5ba2cd] ${pageEnabled(page) ? "" : "opacity-45 grayscale"}`}
                  style={{ aspectRatio: `${page.width}/${page.height}` }}
                  onClick={() => { setActivePageId(page.id); setSelectedBlockId(null); setInsertTool(null); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActivePageId(page.id);
                      setSelectedBlockId(null);
                      setInsertTool(null);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${page.label} bearbeiten`}
                >
                  <PageCanvas page={page} expose={expose} project={project} photos={photos} materials={materials} companySettings={companySettings} editable={false} selectedBlockId={null} setSelectedBlockId={() => {}} readOnly snapTolerance={snapTolerance} onLayoutChange={() => {}} onTextChange={() => {}} insertTool={null} onCreateCustomBlock={() => {}} pageNumber={index + 1} />
                  {page.optional && (
                    <label className="absolute right-2 top-2 z-[60] flex cursor-pointer items-center gap-1.5 rounded bg-white/90 px-2 py-1 text-[9px] font-semibold text-[#27343b] shadow" onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" checked={pageEnabled(page)} disabled={readOnly} onChange={(event) => togglePage(page, event.target.checked)} className="size-3 accent-[#39779c]" /> Druck
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <PropertiesPanel
          page={activePage}
          selectedBlock={blockDefinition}
          layout={selectedLayout}
          readOnly={readOnly || blockDefinition?.type === "generated"}
          insertTool={insertTool}
          onInsertToolChange={(tool) => { setInsertTool(tool); setSelectedBlockId(null); }}
          onTemplateChange={(templateId) => activePage && updatePageTemplate(activePage.id, templateId)}
          onManualPageChange={(patch) => activePage?.kind === "manual" && updateManualPage(activePage.id, patch)}
          onRemoveManualPage={() => activePage?.kind === "manual" && removeManualPage(activePage.id)}
          onCncProgramsPerPageChange={(count) => updateExpose({ cncProgramsPerPage: count })}
          onLayoutChange={(layout) => activePage && blockDefinition && updateBlockLayout(activePage.id, blockDefinition.id, layout)}
          onReset={() => activePage && blockDefinition && resetBlockLayout(activePage.id, blockDefinition.id)}
          onRemove={() => activePage && blockDefinition?.custom && removeCustomBlock(activePage.id, blockDefinition.id)}
          onChooseImage={() => activePage && blockDefinition?.type === "image" && onRequestImage?.({
            kind: blockDefinition.custom ? "custom" : "builtin",
            pageId: activePage.id,
            blockId: blockDefinition.id
          })}
          textValue={selectedText}
          onTextChange={(text) => activePage && blockDefinition && updateBlockText(activePage, blockDefinition.id, text)}
        />
      </div>
    </div>
  );
}
