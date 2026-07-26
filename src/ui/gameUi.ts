export type GameScreen =
  | "hidden"
  | "title"
  | "home"
  | "areaSelect"
  | "loadout"
  | "exploration"
  | "result"
  | "inventory"
  | "crafting"
  | "collection"
  | "settings";

export type ExplorationAction =
  "mine" | "mark" | "cool" | "disable" | "potion" | "bag";

export type TutorialStep = "move" | "read" | "mark" | "treat" | "complete";

export interface ResourceUiState {
  readonly current: number;
  readonly maximum: number;
}

export interface ExplorationUiState {
  readonly areaName: string;
  readonly depth: number;
  readonly maximumDepth: number;
  readonly hp: ResourceUiState;
  readonly stamina: ResourceUiState;
  readonly coins: number;
  readonly bagUsed: number;
  readonly bagCapacity: number;
  readonly toolDurability: number;
  readonly toolMaximumDurability: number;
  readonly selectedAction: ExplorationAction;
  readonly running: boolean;
  readonly message: string;
  readonly objectiveExpanded: boolean;
  readonly tutorialStep: TutorialStep;
  readonly coolants: number;
  readonly disablers: number;
  readonly potions: number;
}

export interface GameUiState {
  readonly screen: GameScreen;
  readonly exploration?: ExplorationUiState;
}

export type UiIntent =
  | {
      readonly type: "selectExplorationAction";
      readonly action: ExplorationAction;
    }
  | { readonly type: "toggleRun" }
  | { readonly type: "toggleObjective" }
  | { readonly type: "openExplorationMenu" }
  | { readonly type: "dismissTutorial" };

type StateListener = (state: GameUiState) => void;
type IntentListener = (intent: UiIntent) => void;

const stateListeners = new Set<StateListener>();
const intentListeners = new Set<IntentListener>();
let currentState: GameUiState = { screen: "hidden" };

export function publishGameUiState(state: GameUiState): void {
  currentState = state;
  stateListeners.forEach((listener) => listener(state));
}

export function hideGameUi(): void {
  publishGameUiState({ screen: "hidden" });
}

export function subscribeGameUiState(listener: StateListener): () => void {
  stateListeners.add(listener);
  listener(currentState);
  return () => stateListeners.delete(listener);
}

export function dispatchUiIntent(intent: UiIntent): void {
  intentListeners.forEach((listener) => listener(intent));
}

export function subscribeUiIntent(listener: IntentListener): () => void {
  intentListeners.add(listener);
  return () => intentListeners.delete(listener);
}

export function advanceTutorialStep(
  current: TutorialStep,
  completed: Exclude<TutorialStep, "complete">,
): TutorialStep {
  if (current !== completed) return current;
  const next: Readonly<
    Record<Exclude<TutorialStep, "complete">, TutorialStep>
  > = {
    move: "read",
    read: "mark",
    mark: "treat",
    treat: "complete",
  };
  return next[completed];
}

export function mountGameUi(root: HTMLElement): () => void {
  root.classList.add("game-ui-root");
  const unsubscribe = subscribeGameUiState((state) => render(root, state));
  const handleClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-ui-intent]",
    );
    if (!target) return;
    const intent = target.dataset.uiIntent;
    if (intent === "toggleRun") {
      dispatchUiIntent({ type: "toggleRun" });
      return;
    }
    if (intent === "toggleObjective") {
      dispatchUiIntent({ type: "toggleObjective" });
      return;
    }
    if (intent === "openExplorationMenu") {
      dispatchUiIntent({ type: "openExplorationMenu" });
      return;
    }
    if (intent === "dismissTutorial") {
      dispatchUiIntent({ type: "dismissTutorial" });
      return;
    }
    if (intent === "selectExplorationAction") {
      const action = target.dataset.action as ExplorationAction | undefined;
      if (action) {
        dispatchUiIntent({ type: "selectExplorationAction", action });
      }
    }
  };
  root.addEventListener("click", handleClick);
  return () => {
    unsubscribe();
    root.removeEventListener("click", handleClick);
    root.replaceChildren();
  };
}

function render(root: HTMLElement, state: GameUiState): void {
  if (state.screen !== "exploration" || !state.exploration) {
    root.replaceChildren();
    root.hidden = true;
    return;
  }
  root.hidden = false;
  root.replaceChildren(createExplorationUi(state.exploration));
}

function createExplorationUi(state: ExplorationUiState): HTMLElement {
  const layer = element("section", "exploration-ui");
  layer.setAttribute("aria-label", "探索インターフェース");

  const hud = element("header", "exploration-hud");
  hud.append(
    createResource("HP", state.hp, "hp"),
    createResource("ST", state.stamina, "stamina"),
  );

  const summary = element("div", "exploration-summary");
  summary.append(
    textElement("span", "summary-value", `${state.coins}C`),
    textElement(
      "span",
      "summary-value",
      `袋 ${state.bagUsed}/${state.bagCapacity}`,
    ),
    textElement(
      "span",
      "summary-value summary-tool",
      `道具 ${state.toolDurability}/${state.toolMaximumDurability}`,
    ),
  );
  hud.append(summary);

  const menu = button("menu-button", "", "openExplorationMenu");
  menu.setAttribute("aria-label", "探索メニューを開く");
  hud.append(menu);
  layer.append(hud);

  const objective = button(
    `objective-chip${state.objectiveExpanded ? " is-expanded" : ""}`,
    "",
    "toggleObjective",
  );
  objective.setAttribute("aria-expanded", String(state.objectiveExpanded));
  objective.append(
    textElement(
      "strong",
      "objective-title",
      `${state.areaName} · ${state.depth}m`,
    ),
    textElement(
      "span",
      "objective-progress",
      state.objectiveExpanded
        ? `目的: 出口へ到達する（最大 ${state.maximumDepth}m）`
        : "目的を表示",
    ),
  );
  layer.append(objective);

  const feedback = textElement("div", "exploration-feedback", state.message);
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  layer.append(feedback);

  const tutorial = createTutorial(state.tutorialStep);
  if (tutorial) layer.append(tutorial);

  const run = button(
    `run-button${state.running ? " is-selected" : ""}`,
    state.running ? "走行中" : "歩行",
    "toggleRun",
  );
  run.setAttribute("aria-pressed", String(state.running));
  layer.append(run);

  const actions = element("nav", "exploration-actions");
  actions.setAttribute("aria-label", "探索アクション");
  const definitions: readonly [ExplorationAction, string, string][] = [
    ["mine", "採掘", "∞"],
    ["mark", "マーク", ""],
    ["cool", "冷却", String(state.coolants)],
    ["disable", "解除", String(state.disablers)],
    ["potion", "回復", String(state.potions)],
    ["bag", "バッグ", `${state.bagUsed}/${state.bagCapacity}`],
  ];
  definitions.forEach(([action, label, count]) => {
    const item = button(
      `action-button${state.selectedAction === action ? " is-selected" : ""}`,
      "",
      "selectExplorationAction",
    );
    item.dataset.action = action;
    item.setAttribute("aria-pressed", String(state.selectedAction === action));
    item.append(
      textElement("span", "action-label", label),
      textElement("span", "action-count", count),
    );
    actions.append(item);
  });
  layer.append(actions);
  return layer;
}

function createResource(
  label: string,
  resource: ResourceUiState,
  kind: "hp" | "stamina",
): HTMLElement {
  const wrapper = element("div", `resource resource-${kind}`);
  const header = element("div", "resource-label");
  header.append(
    textElement("strong", "", label),
    textElement(
      "span",
      "",
      `${Math.floor(resource.current)}/${resource.maximum}`,
    ),
  );
  const track = element("div", "resource-track");
  const fill = element("div", "resource-fill");
  const ratio = Math.max(
    0,
    Math.min(1, resource.current / Math.max(1, resource.maximum)),
  );
  fill.style.width = `${ratio * 100}%`;
  track.append(fill);
  wrapper.append(header, track);
  return wrapper;
}

function createTutorial(step: TutorialStep): HTMLElement | undefined {
  if (step === "complete") return undefined;
  const copy: Readonly<Record<Exclude<TutorialStep, "complete">, string>> = {
    move: "① 左のスティックで開いた床へ移動",
    read: "② 数字は周囲8マスの危険数。数字を読んで安全な壁を採掘",
    mark: "③ 危険だと思う隣の壁を長押し、または「マーク」",
    treat: "④ マークした壁を冷却または解除してから採掘",
  };
  const panel = element("aside", "tutorial-coach");
  panel.append(
    textElement("strong", "tutorial-kicker", "実地ガイド"),
    textElement("span", "tutorial-copy", copy[step]),
  );
  const dismiss = button("tutorial-skip", "閉じる", "dismissTutorial");
  dismiss.setAttribute("aria-label", "実地ガイドを終了");
  panel.append(dismiss);
  return panel;
}

function button(
  className: string,
  text: string,
  intent: string,
): HTMLButtonElement {
  const value = document.createElement("button");
  value.type = "button";
  value.className = className;
  value.dataset.uiIntent = intent;
  value.textContent = text;
  return value;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const value = document.createElement(tag);
  value.className = className;
  return value;
}

function textElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text: string,
): HTMLElementTagNameMap[K] {
  const value = element(tag, className);
  value.textContent = text;
  return value;
}
