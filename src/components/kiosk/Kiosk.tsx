"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BigButton, ErrorBox, Header, Keypad, OnScreenKeyboard, Spinner, Tile, fmtHM, fmtMinutes } from "./ui";
import QrCode from "./QrCode";

type Employee = { id: string; firstName: string; lastName: string; hasPin: boolean; uploadUrl: string | null; minutesToday: number; minutesWeek: number };
type Settings = { materialsEnabled: boolean; descriptionRequired: boolean; idleResetSeconds: number; stepMinutes: number; maxHoursPerEntry: number };
type Project = { id: string; title: string; project_key?: number };
type Task = { id: string; title: string; status: string; workTypeId: string | null };
type Product = { id: string; name: string; code: string | null };
type Material = { productId: string; name: string; code: string | null; quantity: number };

type Step = "employees" | "pin" | "project" | "task" | "hours" | "description" | "materials" | "photos" | "confirm" | "result";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Fout ${r.status}`);
  return j as T;
}

export default function Kiosk({ deviceName }: { deviceName: string }) {
  const [boot, setBoot] = useState<{ employees: Employee[]; settings: Settings } | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("employees");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [pin, setPinState] = useState("");
  const pinRef = useRef("");
  const setPin = useCallback((v: string | ((p: string) => string)) => {
    const next = typeof v === "function" ? v(pinRef.current) : v;
    pinRef.current = next;
    setPinState(next);
  }, []);
  const [pinError, setPinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: "synced" | "error"; error?: string } | null>(null);

  const loadBoot = useCallback(() => {
    api<{ employees: Employee[]; settings: Settings }>("/api/kiosk/bootstrap")
      .then((b) => {
        setBoot(b);
        setBootError(null);
      })
      .catch((e) => setBootError(e.message));
  }, []);
  useEffect(() => {
    loadBoot();
  }, [loadBoot]);

  const reset = useCallback(() => {
    setStep("employees");
    setEmployee(null);
    setPin("");
    setPinError(null);
    setProject(null);
    setTasks(null);
    setTask(null);
    setMinutes(0);
    setDescription("");
    setMaterials([]);
    setProductSearch("");
    setSearchOpen(false);
    setShowQr(false);
    setResult(null);
    setLoadError(null);
    loadBoot();
  }, [loadBoot]);

  // Inactiviteit → terug naar start
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const secs = boot?.settings.idleResetSeconds ?? 90;
    const bump = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (step !== "employees") idleTimer.current = setTimeout(reset, secs * 1000);
    };
    bump();
    const evs = ["pointerdown", "keydown", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, bump));
    return () => {
      evs.forEach((e) => window.removeEventListener(e, bump));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [step, boot, reset]);

  // Resultaatscherm: na 6 s terug
  useEffect(() => {
    if (step !== "result" || result?.status !== "synced") return;
    const t = setTimeout(reset, 6000);
    return () => clearTimeout(t);
  }, [step, result, reset]);

  /* ---------- Handlers ---------- */

  const chooseEmployee = (e: Employee) => {
    setEmployee(e);
    setPin("");
    setPinError(null);
    setStep("pin");
  };

  const loadProjects = useCallback(() => {
    setLoadError(null);
    setProjects(null);
    api<{ projects: Project[] }>("/api/kiosk/projects")
      .then((j) => setProjects(j.projects))
      .catch((e) => setLoadError(e.message));
  }, []);

  const submitPin = useCallback(
    async (p: string) => {
      if (!employee || busy) return;
      setBusy(true);
      setPinError(null);
      try {
        const r = await api<{ ok: boolean; error?: string }>("/api/kiosk/login", { method: "POST", body: JSON.stringify({ employeeId: employee.id, pin: p }) });
        if (!r.ok) {
          setPinError(r.error ?? "Pincode klopt niet");
          setPin("");
          return;
        }
        setStep("project");
        loadProjects();
      } catch (e) {
        setPinError((e as Error).message);
        setPin("");
      } finally {
        setBusy(false);
      }
    },
    [employee, busy, loadProjects],
  );

  const onPinDigit = useCallback(
    (d: string) => {
      if (pinRef.current.length >= 4 || busy) return;
      const next = pinRef.current + d;
      setPin(next);
      if (next.length === 4) submitPin(next);
    },
    [busy, submitPin, setPin],
  );

  const afterDescriptionRef = useRef<() => void>(() => {});
  const confirmRef = useRef<() => void>(() => {});

  // Fysiek toetsenbord (zuil met toetsenbord of numpad)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (step === "pin") {
        if (/^\d$/.test(k)) onPinDigit(k);
        else if (k === "Backspace") setPin((p) => p.slice(0, -1));
        else if (k === "Escape") reset();
        else return;
        e.preventDefault();
      } else if (step === "description") {
        if (k === "Backspace") setDescription((d) => d.slice(0, -1));
        else if (k === "Enter") afterDescriptionRef.current();
        else if (k.length === 1) setDescription((d) => d + k);
        else return;
        e.preventDefault();
      } else if (step === "materials") {
        if (k === "Backspace") setProductSearch((s) => s.slice(0, -1));
        else if (k === "Escape") setProductSearch("");
        else if (k.length === 1) {
          setSearchOpen(false);
          setProductSearch((s) => s + k);
        } else return;
        e.preventDefault();
      } else if (step === "hours") {
        if (k === "+" || k === "ArrowUp") setMinutes((m) => Math.min((boot?.settings.maxHoursPerEntry ?? 12) * 60, m + (boot?.settings.stepMinutes ?? 15)));
        else if (k === "-" || k === "ArrowDown") setMinutes((m) => Math.max(0, m - (boot?.settings.stepMinutes ?? 15)));
        else if (k === "Enter" && minutes > 0) setStep("description");
        else return;
        e.preventDefault();
      } else if (step === "photos" && k === "Enter") {
        e.preventDefault();
        setStep("confirm");
      } else if (step === "confirm" && k === "Enter") {
        e.preventDefault();
        confirmRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onPinDigit, reset, boot, minutes]);

  const chooseProject = (p: Project) => {
    setProject(p);
    setTask(null);
    setTasks(null);
    setLoadError(null);
    setStep("task");
    api<{ tasks: Task[] }>(`/api/kiosk/tasks?project=${encodeURIComponent(p.id)}`)
      .then((j) => setTasks(j.tasks))
      .catch((e) => setLoadError(e.message));
  };

  const chooseTask = (t: Task) => {
    setTask(t);
    setStep("hours");
  };

  const goMaterials = () => {
    setStep("materials");
    if (!products) {
      api<{ products: Product[] }>("/api/kiosk/products")
        .then((j) => setProducts(j.products))
        .catch((e) => setLoadError(e.message));
    }
  };

  /** Na materiaal (of omschrijving): foto-vraag als de medewerker een upload-link heeft, anders bevestigen. */
  const goBeforeConfirm = () => {
    setShowQr(false);
    setStep(employee?.uploadUrl ? "photos" : "confirm");
  };
  const afterDescription = () => (boot?.settings.materialsEnabled ? goMaterials() : goBeforeConfirm());

  const addMaterial = (p: Product) =>
    setMaterials((ms) => {
      const i = ms.findIndex((m) => m.productId === p.id);
      if (i >= 0) return ms.map((m, j) => (j === i ? { ...m, quantity: m.quantity + 1 } : m));
      return [...ms, { productId: p.id, name: p.name, code: p.code, quantity: 1 }];
    });
  const changeQty = (productId: string, delta: number) =>
    setMaterials((ms) => ms.map((m) => (m.productId === productId ? { ...m, quantity: m.quantity + delta } : m)).filter((m) => m.quantity > 0));

  const confirm = async () => {
    if (!employee || !project || !task || busy) return;
    setBusy(true);
    try {
      const r = await api<{ status: "synced" | "error"; error?: string }>("/api/kiosk/entries", {
        method: "POST",
        body: JSON.stringify({
          employeeId: employee.id,
          minutes,
          description,
          project: { id: project.id, title: project.title },
          task: { id: task.id, title: task.title, workTypeId: task.workTypeId },
          materials,
        }),
      });
      setResult(r);
    } catch (e) {
      setResult({ status: "error", error: (e as Error).message });
    } finally {
      setBusy(false);
      setStep("result");
    }
  };

  useEffect(() => {
    afterDescriptionRef.current = afterDescription;
    confirmRef.current = confirm;
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.code ?? "").toLowerCase().includes(q));
  }, [products, productSearch]);

  /* ---------- Render ---------- */

  if (bootError) return <ErrorBox text={bootError} onRetry={loadBoot} />;
  if (!boot) return <Spinner />;
  const s = boot.settings;
  const step15 = s.stepMinutes;
  const maxMin = s.maxHoursPerEntry * 60;
  const fullName = employee ? `${employee.firstName} ${employee.lastName}` : "";

  return (
    <div className="flex h-full flex-col bg-cw-bg select-none">
      {step === "employees" && (
        <>
          <Header title="Wie ben je?" subtitle={`Tik op je naam · ${deviceName}`} />
          <main className="grid flex-1 auto-rows-min grid-cols-2 gap-4 overflow-y-auto p-6 md:grid-cols-3 lg:grid-cols-4">
            {boot.employees.length === 0 && <p className="col-span-full text-xl text-cw-muted">Er zijn nog geen medewerkers zichtbaar. Vraag de beheerder.</p>}
            {boot.employees.map((e) => (
              <Tile key={e.id} onClick={() => chooseEmployee(e)}>
                <span className="block text-3xl">{e.firstName}</span>
                <span className="block text-xl font-normal text-cw-muted">{e.lastName}</span>
                <span className="mt-2 block text-base font-medium tabular-nums text-cw-muted">
                  <span className={e.minutesToday > 0 ? "text-cw-accent-dark" : ""}>Vandaag {fmtHM(e.minutesToday)}</span>
                  <span className="mx-2 text-cw-line">·</span>
                  <span>Week {fmtHM(e.minutesWeek)}</span>
                </span>
              </Tile>
            ))}
          </main>
        </>
      )}

      {step === "pin" && employee && (
        <>
          <Header title={`Hallo ${employee.firstName}`} subtitle="Voer je pincode in" onBack={reset} />
          <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
            <div className="flex gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-6 w-6 rounded-full ${pin.length > i ? "bg-cw-accent" : "bg-cw-line"}`} />
              ))}
            </div>
            {pinError && <p className="text-xl font-semibold text-rose-600">{pinError}</p>}
            {busy ? (
              <Spinner text="Controleren…" />
            ) : (
              <Keypad onDigit={onPinDigit} onBackspace={() => setPin((p) => p.slice(0, -1))} onClear={() => setPin("")} />
            )}
          </main>
        </>
      )}

      {step === "project" && (
        <>
          <Header title="Welk project?" subtitle={fullName} onBack={() => setStep("pin")} />
          <main className="flex flex-1 flex-col overflow-y-auto p-6">
            {loadError ? (
              <ErrorBox text={loadError} onRetry={loadProjects} />
            ) : !projects ? (
              <Spinner text="Projecten ophalen…" />
            ) : projects.length === 0 ? (
              <p className="text-xl text-cw-muted">Geen open projecten gevonden in Teamleader.</p>
            ) : (
              <div className="grid auto-rows-min grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <Tile key={p.id} onClick={() => chooseProject(p)}>
                    {p.project_key != null && <span className="mr-2 text-lg font-normal text-cw-muted">#{p.project_key}</span>}
                    {p.title}
                  </Tile>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {step === "task" && project && (
        <>
          <Header title="Welke taak?" subtitle={project.title} onBack={() => setStep("project")} />
          <main className="flex flex-1 flex-col overflow-y-auto p-6">
            {loadError ? (
              <ErrorBox text={loadError} onRetry={() => chooseProject(project)} />
            ) : !tasks ? (
              <Spinner text="Taken ophalen…" />
            ) : tasks.length === 0 ? (
              <p className="text-xl text-cw-muted">Dit project heeft geen open taken. Kies een ander project.</p>
            ) : (
              <div className="grid auto-rows-min grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tasks.map((t) => (
                  <Tile key={t.id} onClick={() => chooseTask(t)}>
                    {t.title}
                    {t.status === "in_progress" && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-medium text-emerald-700">bezig</span>}
                  </Tile>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {step === "hours" && task && (
        <>
          <Header title="Hoeveel uur?" subtitle={`${project?.title} › ${task.title}`} onBack={() => setStep("task")} />
          <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
            <div className="text-7xl font-extrabold tabular-nums text-cw-dark">{minutes === 0 ? "0 uur" : fmtMinutes(minutes)}</div>
            <div className="flex items-center gap-4">
              <BigButton variant="secondary" onClick={() => setMinutes((m) => Math.max(0, m - step15))} className="w-32 text-4xl">
                −
              </BigButton>
              <span className="text-xl text-cw-muted">{step15} min</span>
              <BigButton variant="secondary" onClick={() => setMinutes((m) => Math.min(maxMin, m + step15))} className="w-32 text-4xl">
                +
              </BigButton>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {[30, 60, 120, 240, 480].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(Math.min(maxMin, m))}
                  className={`h-16 rounded-md px-6 text-2xl font-semibold ring-1 ring-cw-line active:scale-95 ${minutes === m ? "bg-cw-accent text-white" : "bg-white text-cw-dark"}`}
                >
                  {fmtMinutes(m)}
                </button>
              ))}
            </div>
            <BigButton onClick={() => setStep("description")} disabled={minutes === 0} className="w-full max-w-md">
              Verder ›
            </BigButton>
          </main>
        </>
      )}

      {step === "description" && (
        <>
          <Header title="Wat heb je gedaan?" subtitle={s.descriptionRequired ? "Beschrijving is verplicht" : "Optioneel"} onBack={() => setStep("hours")} />
          <main className="flex flex-1 flex-col gap-4 p-6">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Typ een korte omschrijving…"
              className="w-full rounded-md border-2 border-cw-line bg-white px-5 py-4 text-2xl focus:border-cw-accent focus:outline-none"
              inputMode="none"
              readOnly
            />
            <OnScreenKeyboard value={description} onChange={setDescription} />
            <BigButton onClick={afterDescription} disabled={s.descriptionRequired && !description.trim()} className="mt-auto w-full">
              Verder ›
            </BigButton>
          </main>
        </>
      )}

      {step === "materials" && (
        <>
          <Header
            title="Materiaal gebruikt?"
            subtitle="Tik op een artikel om toe te voegen"
            onBack={() => setStep("description")}
            right={
              <BigButton onClick={goBeforeConfirm} className="shrink-0">
                {materials.length ? "Verder ›" : "Geen materiaal ›"}
              </BigButton>
            }
          />
          <main className="flex flex-1 gap-4 overflow-hidden p-6">
            <div className="flex flex-1 flex-col gap-3 overflow-hidden">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSearchOpen((o) => !o)}
                  className={`flex-1 rounded-md border-2 bg-white px-5 py-3 text-left text-xl ${searchOpen ? "border-cw-accent" : "border-cw-line"}`}
                >
                  {productSearch ? <span className="text-cw-dark">{productSearch}</span> : <span className="text-cw-muted">🔍 Zoek artikel…</span>}
                </button>
                {productSearch && (
                  <button type="button" onClick={() => setProductSearch("")} className="rounded-md bg-cw-dark px-5 text-xl font-semibold text-white">
                    ✕
                  </button>
                )}
              </div>
              {loadError ? (
                <ErrorBox text={loadError} onRetry={goMaterials} />
              ) : !products ? (
                <Spinner text="Artikelen ophalen…" />
              ) : (
                <div className="grid auto-rows-min grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2">
                  {filteredProducts.map((p) => (
                    <Tile key={p.id} onClick={() => addMaterial(p)} className="min-h-16 text-xl">
                      {p.name}
                      {p.code && <span className="ml-2 text-base font-normal text-cw-muted">{p.code}</span>}
                    </Tile>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-lg text-cw-muted">Geen artikelen gevonden.</p>}
                </div>
              )}
              {searchOpen && (
                <div className="shrink-0">
                  <OnScreenKeyboard value={productSearch} onChange={setProductSearch} />
                  <BigButton variant="secondary" onClick={() => setSearchOpen(false)} className="mt-2 w-full min-h-14">
                    Toetsenbord sluiten
                  </BigButton>
                </div>
              )}
            </div>
            <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto rounded-md bg-white p-4 ring-1 ring-cw-line">
              <h2 className="text-xl font-bold uppercase tracking-wide text-cw-dark">Gekozen</h2>
              {materials.length === 0 && <p className="text-cw-muted">Nog niets gekozen.</p>}
              {materials.map((m) => (
                <div key={m.productId} className="rounded-md bg-cw-bg p-3">
                  <p className="text-lg font-semibold leading-tight">{m.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" onClick={() => changeQty(m.productId, -1)} className="h-12 w-12 rounded-md bg-cw-dark text-2xl font-bold text-white active:scale-95">
                      −
                    </button>
                    <span className="w-12 text-center text-2xl font-bold tabular-nums">{m.quantity}</span>
                    <button type="button" onClick={() => changeQty(m.productId, +1)} className="h-12 w-12 rounded-md bg-cw-dark text-2xl font-bold text-white active:scale-95">
                      +
                    </button>
                  </div>
                </div>
              ))}
            </aside>
          </main>
        </>
      )}

      {step === "photos" && employee && employee.uploadUrl && (
        <>
          <Header title="Foto's uploaden?" subtitle={fullName} onBack={() => setStep(s.materialsEnabled ? "materials" : "description")} />
          <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
            {!showQr ? (
              <>
                <p className="max-w-xl text-center text-2xl text-cw-dark">Wil je foto&apos;s van je werk toevoegen? Dat kan met je telefoon.</p>
                <div className="flex w-full max-w-2xl gap-4">
                  <BigButton variant="secondary" onClick={() => setStep("confirm")} className="flex-1">
                    Nee, verder
                  </BigButton>
                  <BigButton onClick={() => setShowQr(true)} className="flex-1">
                    Ja, toon QR-code
                  </BigButton>
                </div>
              </>
            ) : (
              <>
                <p className="max-w-xl text-center text-2xl text-cw-dark">Scan met de camera van je telefoon en upload je foto&apos;s.</p>
                <div className="rounded-md border-t-4 border-cw-accent bg-white p-6 shadow ring-1 ring-cw-line">
                  <QrCode value={employee.uploadUrl} size={320} />
                </div>
                <BigButton onClick={() => setStep("confirm")} className="w-full max-w-md">
                  Klaar, verder ›
                </BigButton>
              </>
            )}
          </main>
        </>
      )}

      {step === "confirm" && employee && project && task && (
        <>
          <Header title="Klopt dit?" subtitle={fullName} onBack={() => setStep(employee.uploadUrl ? "photos" : s.materialsEnabled ? "materials" : "description")} />
          <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
            <dl className="grid w-full max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-md border-t-4 border-cw-accent bg-white p-8 text-2xl ring-1 ring-cw-line">
              <dt className="text-cw-muted">Datum</dt>
              <dd className="font-semibold">Vandaag</dd>
              <dt className="text-cw-muted">Project</dt>
              <dd className="font-semibold">{project.title}</dd>
              <dt className="text-cw-muted">Taak</dt>
              <dd className="font-semibold">{task.title}</dd>
              <dt className="text-cw-muted">Uren</dt>
              <dd className="font-semibold">{fmtMinutes(minutes)}</dd>
              <dt className="text-cw-muted">Omschrijving</dt>
              <dd className="font-semibold">{description || <span className="font-normal text-cw-muted">—</span>}</dd>
              {s.materialsEnabled && (
                <>
                  <dt className="text-cw-muted">Materiaal</dt>
                  <dd className="font-semibold">
                    {materials.length === 0 ? (
                      <span className="font-normal text-cw-muted">geen</span>
                    ) : (
                      <ul>
                        {materials.map((m) => (
                          <li key={m.productId}>
                            {m.quantity} × {m.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </>
              )}
            </dl>
            <div className="flex w-full max-w-2xl gap-4">
              <BigButton variant="secondary" onClick={reset} className="flex-1">
                Annuleren
              </BigButton>
              <BigButton variant="success" onClick={confirm} disabled={busy} className="flex-[2]">
                {busy ? "Bezig…" : "✓ Bevestigen"}
              </BigButton>
            </div>
          </main>
        </>
      )}

      {step === "result" && result && (
        <main className={`flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center ${result.status === "synced" ? "bg-emerald-50" : "bg-amber-50"}`}>
          {result.status === "synced" ? (
            <>
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-600 text-7xl text-white">✓</div>
              <h1 className="text-4xl font-black text-emerald-800">Geboekt!</h1>
              <p className="text-2xl text-emerald-700">
                {fmtMinutes(minutes)} op {task?.title}
              </p>
              <p className="text-lg text-emerald-700">Dit scherm sluit vanzelf.</p>
            </>
          ) : (
            <>
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-amber-500 text-6xl text-white">!</div>
              <h1 className="text-4xl font-black text-amber-800">Opgeslagen, nog niet in Teamleader</h1>
              <p className="max-w-2xl text-xl text-amber-700">Je uren zijn bewaard op de zuil. De beheerder stuurt ze alsnog door.</p>
              <p className="max-w-2xl break-words text-base text-amber-600">{result.error}</p>
            </>
          )}
          <BigButton onClick={reset} className="mt-4 w-full max-w-md">
            Klaar
          </BigButton>
        </main>
      )}
    </div>
  );
}
