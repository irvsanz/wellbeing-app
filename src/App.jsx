import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// FIREBASE CONFIG — Replace with your own Firebase project config
// ============================================================
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or use existing)
// 3. Go to Project Settings > General > Your apps > Add web app
// 4. Copy the firebaseConfig object and paste below
// 5. Enable Authentication > Email/Password in the Firebase console
// 6. Create a Firestore database (start in test mode, then add rules)
//
// Firestore rules (paste in Firestore > Rules):
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{userId}/{document=**} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//     }
//   }
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC453nhoG_M9fayN9qw2yWJ6K3rixcYLNg",
  authDomain: "wellbeing-44092.firebaseapp.com",
  projectId: "wellbeing-44092",
  storageBucket: "wellbeing-44092.firebasestorage.app",
  messagingSenderId: "247227946502",
  appId: "1:247227946502:web:7450975908ed5670e09587",
  measurementId: "G-TQ6DB49B2J",
};

// ============================================================
// Firebase setup — using npm package
// ============================================================
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const firebaseAuth = getAuth(firebaseApp);
const firebaseDb = getFirestore(firebaseApp);

// ============================================================
// Firestore helpers
// ============================================================
async function saveToCloud(userId, path, data) {
  if (!userId) return;
  try {
    await setDoc(doc(firebaseDb, "users", userId, ...path.split("/")), {
      ...data,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error("Save failed:", e);
  }
}

async function loadFromCloud(userId, path) {
  if (!userId) return null;
  try {
    const snap = await getDoc(doc(firebaseDb, "users", userId, ...path.split("/")));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Load failed:", e);
    return null;
  }
}

async function loadCollection(userId, collectionName) {
  if (!userId) return {};
  try {
    const snap = await getDocs(collection(firebaseDb, "users", userId, collectionName));
    const result = {};
    snap.forEach(d => { result[d.id] = d.data(); });
    return result;
  } catch (e) {
    console.error("Load collection failed:", e);
    return {};
  }
}

// ============================================================
// App constants
// ============================================================
const DEFAULT_TASKS = [
  { id: "make-bed", label: "Make the bed", category: "self-care", timeOfDay: "morning", icon: "🛏️" },
  { id: "clothes-away", label: "Put clothes away", category: "self-care", timeOfDay: "morning", icon: "👕" },
  { id: "shower", label: "Shower / hygiene", category: "self-care", timeOfDay: "morning", icon: "🚿" },
  { id: "eat-breakfast", label: "Eat breakfast", category: "nourishment", timeOfDay: "morning", icon: "🍳" },
  { id: "take-meds", label: "Take medication", category: "medication", timeOfDay: "morning", icon: "💊" },
  { id: "sunscreen", label: "Put on sunscreen", category: "self-care", timeOfDay: "morning", icon: "🧴" },
  { id: "grab-essentials", label: "Grab wallet, ID & keys", category: "prep", timeOfDay: "morning", icon: "🔑" },
  { id: "drink-water", label: "Drink water", category: "nourishment", timeOfDay: "afternoon", icon: "💧" },
  { id: "walk-1", label: "First walk", category: "movement", timeOfDay: "afternoon", icon: "🚶" },
  { id: "reapply-sunscreen", label: "Reapply sunscreen", category: "self-care", timeOfDay: "afternoon", icon: "🧴" },
  { id: "eat-lunch", label: "Eat lunch", category: "nourishment", timeOfDay: "afternoon", icon: "🥗" },
  { id: "walk-2", label: "Second walk", category: "movement", timeOfDay: "afternoon", icon: "🚶" },
  { id: "eat-dinner", label: "Eat dinner", category: "nourishment", timeOfDay: "evening", icon: "🍽️" },
  { id: "walk-3", label: "Third walk", category: "movement", timeOfDay: "evening", icon: "🚶" },
  { id: "review-agenda", label: "Review next day's agenda", category: "prep", timeOfDay: "evening", icon: "📋" },
  { id: "prep-bookbag", label: "Prepare bookbag", category: "prep", timeOfDay: "evening", icon: "🎒" },
  { id: "prep-clothes", label: "Prepare clothes", category: "prep", timeOfDay: "evening", icon: "👔" },
  { id: "wind-down", label: "Start wind-down routine", category: "rest", timeOfDay: "evening", icon: "🌙" },
];

const TIME_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
const MOOD_LABELS = ["Very Low", "Low", "Neutral", "Good", "Great"];
const ENERGY_LABELS = ["Depleted", "Low", "Moderate", "Good", "High"];
const MOOD_COLORS = ["#e57373", "#ffb74d", "#fff176", "#aed581", "#81c784"];
const ENERGY_COLORS = ["#b0bec5", "#90a4ae", "#78909c", "#5c9ce6", "#42a5f5"];
const SLEEP_QUALITY_LABELS = ["Terrible", "Poor", "Fair", "Good", "Great"];
const SLEEP_QUALITY_COLORS = ["#e57373", "#ffb74d", "#fff176", "#aed581", "#81c784"];

const WORKOUT_TYPES = [
  { id: "walking", label: "Walking", icon: "🚶" },
  { id: "running", label: "Running", icon: "🏃" },
  { id: "weights", label: "Weights", icon: "🏋️" },
  { id: "cycling", label: "Cycling", icon: "🚴" },
  { id: "climbing", label: "Climbing", icon: "🧗" },
  { id: "cardio", label: "Cardio", icon: "❤️‍🔥" },
  { id: "sports", label: "Sports", icon: "🏀" },
  { id: "other", label: "Other", icon: "💪" },
];

const INTENSITY_LABELS = ["Light", "Moderate", "Hard", "Max"];
const INTENSITY_COLORS = ["#81c784", "#fff176", "#ffb74d", "#e57373"];

function getToday() { return new Date().toISOString().split("T")[0]; }
function getDayName() { return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}
function calcSleepHours(bed, wake) {
  if (!bed || !wake) return 0;
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) wakeMin += 24 * 60;
  return Math.round(((wakeMin - bedMin) / 60) * 10) / 10;
}

// ============================================================
// Shared UI components
// ============================================================
function Confetti({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 3, dx: (Math.random() - 0.5) * 4, dy: Math.random() * 3 + 2,
      color: ["#81c784","#aed581","#fff176","#ffb74d","#e6a0c4","#90caf9","#ce93d8"][Math.floor(Math.random()*7)],
      rot: Math.random()*360, rotSpeed: (Math.random()-0.5)*10,
    }));
    let frame, opacity = 1;
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height); ctx.globalAlpha = opacity;
      particles.forEach(p => {
        p.x+=p.dx; p.y+=p.dy; p.rot+=p.rotSpeed;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle=p.color; ctx.fillRect(-p.r,-p.r/2,p.r*2,p.r); ctx.restore();
      });
      opacity-=0.005; if(opacity>0) frame=requestAnimationFrame(draw);
    }
    draw(); return ()=>cancelAnimationFrame(frame);
  }, [active]);
  if(!active) return null;
  return <canvas ref={canvasRef} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999}}/>;
}

function CircleProgress({ percent, size=80, stroke=6, color="#81c784" }) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, off=circ-(percent/100)*circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset 0.6s ease"}}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{transform:"rotate(90deg)",transformOrigin:"center",fontSize:size*0.28,fontWeight:700,fill:"#fff",fontFamily:"'DM Sans',sans-serif"}}>
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

function ScaleSelector({ value, onChange, labels, colors, label, emojis }) {
  const emos = emojis || ["😞","😔","😐","🙂","😊"];
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>{label}</div>
      <div style={{display:"flex",gap:8,justifyContent:"center"}}>
        {labels.map((l,i) => (
          <button key={i} onClick={()=>onChange(i+1)} style={{
            flex:1,padding:"12px 4px",border:"2px solid",
            borderColor:value===i+1?colors[i]:"rgba(255,255,255,0.1)",
            borderRadius:14,background:value===i+1?colors[i]+"25":"rgba(255,255,255,0.03)",
            color:value===i+1?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all 0.2s",
            fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
            display:"flex",flexDirection:"column",alignItems:"center",gap:6,
          }}>
            <span style={{fontSize:22}}>{emos[i]}</span><span>{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeInput({ value, onChange, label }) {
  return (
    <div style={{flex:1}}>
      <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",marginBottom:6}}>{label}</div>
      <input type="time" value={value} onChange={e=>onChange(e.target.value)} style={{
        width:"100%",padding:"10px 12px",background:"rgba(255,255,255,0.06)",
        border:"1.5px solid rgba(255,255,255,0.12)",borderRadius:10,
        color:"#fff",fontSize:16,fontFamily:"'DM Sans',sans-serif",
        outline:"none",boxSizing:"border-box",colorScheme:"dark",
      }}/>
    </div>
  );
}

function NumberStepper({ value, onChange, label, unit, min=0, max=999, step=1 }) {
  const btnStyle = {width:36,height:36,borderRadius:10,border:"1.5px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:18,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center"};
  return (
    <div style={{flex:1}}>
      <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",marginBottom:6}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>onChange(Math.max(min,(value||0)-step))} style={btnStyle}>−</button>
        <div style={{flex:1,textAlign:"center",fontSize:20,fontWeight:700,color:"#fff"}}>
          {value||0}<span style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.4)",marginLeft:4}}>{unit}</span>
        </div>
        <button onClick={()=>onChange(Math.min(max,(value||0)+step))} style={btnStyle}>+</button>
      </div>
    </div>
  );
}

// ============================================================
// Auth Screen
// ============================================================
function AuthScreen({ onAuth, loading: parentLoading }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      }
    } catch (e) {
      const messages = {
        "auth/email-already-in-use": "This email is already registered. Try logging in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
      };
      setError(messages[e.code] || e.message);
    }
    setLoading(false);
  };

  const inputStyle = {
    width:"100%",padding:"14px 16px",background:"rgba(255,255,255,0.06)",
    border:"1.5px solid rgba(255,255,255,0.12)",borderRadius:12,
    color:"#fff",fontSize:15,fontFamily:"'DM Sans',sans-serif",
    outline:"none",boxSizing:"border-box",marginBottom:12,
  };

  if (parentLoading) {
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1a1a2e 0%,#16213e 40%,#0f3460 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{textAlign:"center",color:"rgba(255,255,255,0.5)"}}>
          <div style={{fontSize:32,marginBottom:12}}>🌿</div>
          <div style={{fontSize:14}}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1a1a2e 0%,#16213e 40%,#0f3460 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:48,marginBottom:8}}>🌿</div>
          <div style={{fontSize:28,fontWeight:800,color:"#fff",marginBottom:4}}>Wellbeing</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.5)"}}>Your daily companion for building better habits</div>
        </div>

        <div style={{background:"rgba(255,255,255,0.06)",borderRadius:20,padding:28,border:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.06)",borderRadius:12,padding:3,marginBottom:24}}>
            {["login","signup"].map(m => (
              <button key={m} onClick={()=>{setMode(m);setError("");}} style={{
                flex:1,padding:"10px 0",border:"none",borderRadius:10,
                background:mode===m?"rgba(129,199,132,0.25)":"transparent",
                color:mode===m?"#81c784":"rgba(255,255,255,0.4)",
                fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
              }}>
                {m==="login"?"Log In":"Sign Up"}
              </button>
            ))}
          </div>

          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
            style={inputStyle} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
            style={inputStyle} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />

          {error && (
            <div style={{background:"rgba(229,115,115,0.15)",border:"1px solid rgba(229,115,115,0.3)",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#e57373"}}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading || !email || !password}
            style={{
              width:"100%",padding:"14px",borderRadius:14,border:"none",
              background:!loading&&email&&password?"linear-gradient(135deg,#81c784,#4caf50)":"rgba(255,255,255,0.08)",
              color:!loading&&email&&password?"#fff":"rgba(255,255,255,0.3)",
              fontSize:15,fontWeight:700,cursor:!loading&&email&&password?"pointer":"default",
              fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s",
            }}>
            {loading ? "Please wait..." : mode==="login" ? "Log In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function WellbeingApp() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const today = getToday();
  const [completedTasks, setCompletedTasks] = useState({});
  const [mood, setMood] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [moodNote, setMoodNote] = useState("");
  const [history, setHistory] = useState({});
  const [view, setView] = useState("today");
  const [showConfetti, setShowConfetti] = useState(false);
  const [tasks] = useState(DEFAULT_TASKS);

  const [sleepBedtime, setSleepBedtime] = useState("");
  const [sleepWake, setSleepWake] = useState("");
  const [sleepQuality, setSleepQuality] = useState(0);
  const [sleepNote, setSleepNote] = useState("");

  const [workouts, setWorkouts] = useState([]);
  const [workoutForm, setWorkoutForm] = useState({ type:"", duration:30, intensity:0, note:"" });

  const prevCompleted = useRef(0);
  const saveTimer = useRef(null);
  const completedCount = Object.keys(completedTasks).filter(k=>completedTasks[k]).length;
  const totalTasks = tasks.length;
  const percent = totalTasks > 0 ? (completedCount/totalTasks)*100 : 0;
  const sleepHours = calcSleepHours(sleepBedtime, sleepWake);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u);
      setAuthChecked(true);
      if (!u) setDataLoaded(false);
    });
    return () => unsubscribe();
  }, []);

  // Load data when user logs in
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Load today's data
        const dayData = await loadFromCloud(user.uid, `days/${today}`);
        if (dayData) {
          setCompletedTasks(dayData.completed || {});
          setMood(dayData.mood || 0);
          setEnergy(dayData.energy || 0);
          setMoodNote(dayData.note || "");
          setSleepBedtime(dayData.sleepBedtime || "");
          setSleepWake(dayData.sleepWake || "");
          setSleepQuality(dayData.sleepQuality || 0);
          setSleepNote(dayData.sleepNote || "");
          setWorkouts(dayData.workouts || []);
          prevCompleted.current = Object.keys(dayData.completed || {}).filter(k => dayData.completed[k]).length;
        }
        // Load history (last 30 days)
        const allDays = await loadCollection(user.uid, "days");
        setHistory(allDays);
      } catch (e) {
        console.error("Failed to load data:", e);
      }
      setDataLoaded(true);
    })();
  }, [user, today]);

  // Debounced save to cloud
  const saveToCloudDebounced = useCallback((data) => {
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToCloud(user.uid, `days/${today}`, data);
    }, 800);
  }, [user, today]);

  // Save whenever data changes
  useEffect(() => {
    if (!user || !dataLoaded) return;
    const data = {
      completed: completedTasks, mood, energy, note: moodNote, total: totalTasks,
      sleepBedtime, sleepWake, sleepQuality, sleepNote, sleepHours, workouts,
    };
    setHistory(h => ({ ...h, [today]: data }));
    saveToCloudDebounced(data);
  }, [completedTasks, mood, energy, moodNote, totalTasks, sleepBedtime, sleepWake, sleepQuality, sleepNote, sleepHours, workouts, user, dataLoaded, today, saveToCloudDebounced]);

  // Confetti
  useEffect(() => {
    if (completedCount === totalTasks && totalTasks > 0 && prevCompleted.current < totalTasks) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    prevCompleted.current = completedCount;
  }, [completedCount, totalTasks]);

  const toggleTask = useCallback((id) => {
    setCompletedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const addWorkout = () => {
    if (!workoutForm.type) return;
    setWorkouts(prev => [...prev, { ...workoutForm, id: Date.now() }]);
    setWorkoutForm({ type:"", duration:30, intensity:0, note:"" });
  };
  const removeWorkout = (id) => setWorkouts(prev => prev.filter(w=>w.id!==id));

  const handleSignOut = async () => {
    await signOut(firebaseAuth);
    setCompletedTasks({}); setMood(0); setEnergy(0); setMoodNote("");
    setSleepBedtime(""); setSleepWake(""); setSleepQuality(0); setSleepNote("");
    setWorkouts([]); setHistory({});
  };

  const getStreak = () => {
    let streak = 0; const d = new Date();
    const todayEntry = history[today];
    const todayComplete = todayEntry && Object.keys(todayEntry.completed||{}).filter(k=>todayEntry.completed[k]).length===(todayEntry.total||totalTasks);
    if(!todayComplete) d.setDate(d.getDate()-1);
    while(true) {
      const key=d.toISOString().split("T")[0]; const entry=history[key];
      if(entry){const done=Object.keys(entry.completed||{}).filter(k=>entry.completed[k]).length;
        if(done===(entry.total||totalTasks)){streak++;d.setDate(d.getDate()-1);continue;}}
      break;
    }
    if(todayComplete) streak=Math.max(streak,1); return streak;
  };

  const getMedStreak = () => {
    let streak=0; const medIds=tasks.filter(t=>t.category==="medication").map(t=>t.id);
    const d=new Date(); const todayEntry=history[today];
    const todayMeds=todayEntry&&medIds.every(id=>todayEntry.completed?.[id]);
    if(!todayMeds) d.setDate(d.getDate()-1);
    while(true){
      const key=d.toISOString().split("T")[0]; const entry=history[key];
      if(entry&&medIds.every(id=>entry.completed?.[id])){streak++;d.setDate(d.getDate()-1);continue;}
      break;
    }
    if(todayMeds) streak=Math.max(streak,1); return streak;
  };

  const streak = getStreak();
  const medStreak = getMedStreak();
  const last7 = getLast7Days();

  // Show auth screen if not logged in
  if (!authChecked || (!user && authChecked)) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" rel="stylesheet" />
        <AuthScreen onAuth={()=>{}} loading={!authChecked} />
      </>
    );
  }

  if (!dataLoaded) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" rel="stylesheet" />
        <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1a1a2e 0%,#16213e 40%,#0f3460 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
          <div style={{textAlign:"center",color:"rgba(255,255,255,0.5)"}}>
            <div style={{fontSize:32,marginBottom:12}}>🌿</div>
            <div style={{fontSize:14}}>Syncing your data...</div>
          </div>
        </div>
      </>
    );
  }

  const styles = {
    app: { minHeight:"100vh", background:"linear-gradient(160deg,#1a1a2e 0%,#16213e 40%,#0f3460 100%)", fontFamily:"'DM Sans',sans-serif", color:"#fff", maxWidth:480, margin:"0 auto", position:"relative", paddingBottom:100 },
    header: { padding:"32px 24px 16px", textAlign:"center" },
    greeting: { fontSize:14, color:"rgba(255,255,255,0.5)", fontWeight:500, letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 },
    date: { fontSize:22, fontWeight:700, color:"#fff", marginBottom:20 },
    nav: { display:"flex", justifyContent:"center", gap:2, background:"rgba(255,255,255,0.06)", borderRadius:16, padding:4, margin:"0 16px 24px" },
    navBtn: (active) => ({ flex:1, padding:"9px 0", border:"none", borderRadius:12, background:active?"rgba(129,199,132,0.25)":"transparent", color:active?"#81c784":"rgba(255,255,255,0.4)", fontWeight:600, fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }),
    section: { margin:"0 24px 20px" },
    sectionTitle: { fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:2, marginBottom:12 },
    taskRow: (done) => ({ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", marginBottom:8, background:done?"rgba(129,199,132,0.1)":"rgba(255,255,255,0.04)", borderRadius:14, cursor:"pointer", transition:"all 0.25s", border:`1.5px solid ${done?"rgba(129,199,132,0.3)":"rgba(255,255,255,0.06)"}` }),
    checkbox: (done) => ({ width:26, height:26, borderRadius:8, flexShrink:0, border:`2px solid ${done?"#81c784":"rgba(255,255,255,0.2)"}`, background:done?"#81c784":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", fontSize:14, color:"#1a1a2e" }),
    taskLabel: (done) => ({ fontSize:15, fontWeight:500, color:done?"rgba(255,255,255,0.5)":"#fff", textDecoration:done?"line-through":"none", transition:"all 0.2s" }),
    card: { background:"rgba(255,255,255,0.06)", borderRadius:18, padding:20, border:"1px solid rgba(255,255,255,0.08)", marginBottom:16 },
    streakBadge: (val) => ({ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:val>0?"rgba(255,183,77,0.15)":"rgba(255,255,255,0.06)", color:val>0?"#ffb74d":"rgba(255,255,255,0.4)", fontSize:14, fontWeight:700 }),
  };

  const renderToday = () => {
    const grouped = {};
    tasks.forEach(t => { if(!grouped[t.timeOfDay]) grouped[t.timeOfDay]=[]; grouped[t.timeOfDay].push(t); });
    return (
      <>
        <div style={{display:"flex",justifyContent:"center",marginBottom:24}}>
          <div style={{textAlign:"center"}}>
            <CircleProgress percent={percent} size={100} stroke={7}/>
            <div style={{marginTop:8,fontSize:13,color:"rgba(255,255,255,0.5)"}}>{completedCount}/{totalTasks} complete</div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:28,padding:"0 24px",flexWrap:"wrap"}}>
          <div style={styles.streakBadge(streak)}>🔥 {streak} day streak</div>
          <div style={styles.streakBadge(medStreak)}>💊 {medStreak} day med streak</div>
        </div>
        {["morning","afternoon","evening"].map(time => (
          grouped[time]?.length>0 && (
            <div key={time} style={styles.section}>
              <div style={styles.sectionTitle}>{TIME_LABELS[time]}</div>
              {grouped[time].map(task => {
                const done=!!completedTasks[task.id];
                return (
                  <div key={task.id} style={styles.taskRow(done)} onClick={()=>toggleTask(task.id)}>
                    <div style={styles.checkbox(done)}>{done?"✓":""}</div>
                    <span style={{fontSize:18,flexShrink:0}}>{task.icon}</span>
                    <span style={styles.taskLabel(done)}>{task.label}</span>
                  </div>
                );
              })}
            </div>
          )
        ))}
      </>
    );
  };

  const renderMood = () => (
    <div style={{padding:"0 24px"}}>
      <div style={styles.card}>
        <ScaleSelector value={mood} onChange={setMood} labels={MOOD_LABELS} colors={MOOD_COLORS} label="How's your mood?"/>
        <ScaleSelector value={energy} onChange={setEnergy} labels={ENERGY_LABELS} colors={ENERGY_COLORS} label="Energy level?" emojis={["🪫","🔋","⚡","✨","🚀"]}/>
        <div style={{marginTop:8}}>
          <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Notes (optional)</div>
          <textarea value={moodNote} onChange={e=>setMoodNote(e.target.value)} placeholder="How are you feeling? Anything worth noting..."
            style={{width:"100%",minHeight:80,background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.1)",borderRadius:12,color:"#fff",padding:14,fontSize:14,fontFamily:"'DM Sans',sans-serif",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
        </div>
      </div>
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Last 7 Days</div>
        <div style={{display:"flex",justifyContent:"space-between",gap:4}}>
          {last7.map(day => {
            const entry=history[day]; const m=entry?.mood||0; const e=entry?.energy||0;
            const dayLabel=new Date(day+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"});
            const isToday=day===today;
            return (
              <div key={day} style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:10,color:isToday?"#81c784":"rgba(255,255,255,0.35)",fontWeight:isToday?700:500,marginBottom:6}}>{isToday?"Today":dayLabel}</div>
                <div style={{width:28,height:28,borderRadius:"50%",margin:"0 auto 4px",background:m>0?MOOD_COLORS[m-1]+"40":"rgba(255,255,255,0.06)",border:`2px solid ${m>0?MOOD_COLORS[m-1]:"rgba(255,255,255,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>
                  {m>0?["😞","😔","😐","🙂","😊"][m-1]:"·"}
                </div>
                <div style={{width:"60%",height:4,borderRadius:2,margin:"0 auto",background:"rgba(255,255,255,0.08)"}}>
                  <div style={{width:e>0?`${(e/5)*100}%`:"0%",height:"100%",borderRadius:2,background:e>0?ENERGY_COLORS[e-1]:"transparent",transition:"width 0.3s"}}/>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:14,fontSize:11,color:"rgba(255,255,255,0.35)"}}>
          <span>🔵 Mood</span><span>— Energy</span>
        </div>
      </div>
    </div>
  );

  const renderSleep = () => {
    const sleepColor = sleepHours>=7&&sleepHours<=9?"#81c784":sleepHours>0?"#ffb74d":"rgba(255,255,255,0.3)";
    return (
      <div style={{padding:"0 24px"}}>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Last Night's Sleep</div>
          <div style={{display:"flex",gap:16,marginBottom:20}}>
            <TimeInput label="Bedtime" value={sleepBedtime} onChange={setSleepBedtime}/>
            <TimeInput label="Wake time" value={sleepWake} onChange={setSleepWake}/>
          </div>
          {sleepHours>0 && (
            <div style={{textAlign:"center",marginBottom:20,padding:16,background:"rgba(255,255,255,0.04)",borderRadius:14}}>
              <div style={{fontSize:40,fontWeight:800,color:sleepColor}}>{sleepHours}<span style={{fontSize:16,fontWeight:500,color:"rgba(255,255,255,0.5)"}}> hrs</span></div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4}}>
                {sleepHours>=7&&sleepHours<=9?"Right in the sweet spot!":sleepHours<7?"Below recommended 7-9 hours":"Above recommended 7-9 hours"}
              </div>
            </div>
          )}
          <ScaleSelector value={sleepQuality} onChange={setSleepQuality} labels={SLEEP_QUALITY_LABELS} colors={SLEEP_QUALITY_COLORS} label="Sleep quality?" emojis={["😩","😴","😐","😌","🌟"]}/>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",marginBottom:6}}>Sleep notes</div>
            <textarea value={sleepNote} onChange={e=>setSleepNote(e.target.value)} placeholder="Dreams, disruptions, how you feel waking up..."
              style={{width:"100%",minHeight:60,background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.1)",borderRadius:12,color:"#fff",padding:14,fontSize:14,fontFamily:"'DM Sans',sans-serif",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Sleep This Week</div>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:6,height:120,marginBottom:8}}>
            {last7.map(day => {
              const entry=history[day]; const hrs=entry?.sleepHours||0;
              const barH=hrs>0?Math.max(8,(hrs/12)*100):4;
              const col=hrs>=7&&hrs<=9?"#81c784":hrs>0?"#ffb74d":"rgba(255,255,255,0.1)";
              const dayLabel=new Date(day+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"});
              const isToday=day===today;
              return (
                <div key={day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
                  {hrs>0&&<div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginBottom:4,fontWeight:600}}>{hrs}h</div>}
                  <div style={{width:"70%",height:barH,borderRadius:6,background:col,transition:"height 0.3s"}}/>
                  <div style={{fontSize:10,color:isToday?"#81c784":"rgba(255,255,255,0.35)",marginTop:6,fontWeight:isToday?700:500}}>{isToday?"Today":dayLabel}</div>
                </div>
              );
            })}
          </div>
          <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.3)"}}>
            <span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"#81c784",marginRight:4,verticalAlign:"middle"}}/> 7-9 hrs
            <span style={{marginLeft:12,display:"inline-block",width:8,height:8,borderRadius:2,background:"#ffb74d",marginRight:4,verticalAlign:"middle"}}/> Outside range
          </div>
        </div>
      </div>
    );
  };

  const renderWorkout = () => (
    <div style={{padding:"0 24px"}}>
      <div style={styles.card}>
        <div style={styles.sectionTitle}>Log a Workout</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
          {WORKOUT_TYPES.map(wt => (
            <button key={wt.id} onClick={()=>setWorkoutForm(f=>({...f,type:wt.id}))} style={{
              padding:"8px 14px",borderRadius:12,border:"1.5px solid",
              borderColor:workoutForm.type===wt.id?"#42a5f5":"rgba(255,255,255,0.1)",
              background:workoutForm.type===wt.id?"rgba(66,165,245,0.15)":"rgba(255,255,255,0.03)",
              color:workoutForm.type===wt.id?"#fff":"rgba(255,255,255,0.5)",
              cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif",fontWeight:600,transition:"all 0.2s",
            }}>{wt.icon} {wt.label}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:16,marginBottom:16}}>
          <NumberStepper label="Duration" value={workoutForm.duration} onChange={v=>setWorkoutForm(f=>({...f,duration:v}))} unit="min" min={5} max={300} step={5}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.5)",marginBottom:8}}>Intensity</div>
          <div style={{display:"flex",gap:8}}>
            {INTENSITY_LABELS.map((il,i) => (
              <button key={i} onClick={()=>setWorkoutForm(f=>({...f,intensity:i+1}))} style={{
                flex:1,padding:"10px 4px",borderRadius:10,border:"1.5px solid",
                borderColor:workoutForm.intensity===i+1?INTENSITY_COLORS[i]:"rgba(255,255,255,0.1)",
                background:workoutForm.intensity===i+1?INTENSITY_COLORS[i]+"25":"rgba(255,255,255,0.03)",
                color:workoutForm.intensity===i+1?"#fff":"rgba(255,255,255,0.4)",
                cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s",
              }}>{il}</button>
            ))}
          </div>
        </div>
        <textarea value={workoutForm.note} onChange={e=>setWorkoutForm(f=>({...f,note:e.target.value}))} placeholder="Workout notes (optional)..."
          style={{width:"100%",minHeight:50,background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.1)",borderRadius:12,color:"#fff",padding:12,fontSize:13,fontFamily:"'DM Sans',sans-serif",resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
        <button onClick={addWorkout} disabled={!workoutForm.type||!workoutForm.intensity} style={{
          width:"100%",padding:"14px",borderRadius:14,border:"none",
          background:workoutForm.type&&workoutForm.intensity?"linear-gradient(135deg,#42a5f5,#5c6bc0)":"rgba(255,255,255,0.08)",
          color:workoutForm.type&&workoutForm.intensity?"#fff":"rgba(255,255,255,0.3)",
          fontSize:15,fontWeight:700,cursor:workoutForm.type&&workoutForm.intensity?"pointer":"default",
          fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s",
        }}>+ Log Workout</button>
      </div>
      {workouts.length>0 && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Today's Workouts</div>
          {workouts.map(w => {
            const wt=WORKOUT_TYPES.find(t=>t.id===w.type);
            return (
              <div key={w.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",marginBottom:8,background:"rgba(255,255,255,0.04)",borderRadius:14,border:"1px solid rgba(255,255,255,0.06)"}}>
                <span style={{fontSize:24}}>{wt?.icon||"💪"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{wt?.label||w.type}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>{w.duration} min · {INTENSITY_LABELS[w.intensity-1]||""}{w.note&&` · ${w.note}`}</div>
                </div>
                <button onClick={()=>removeWorkout(w.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.25)",fontSize:18,cursor:"pointer",padding:4}}>✕</button>
              </div>
            );
          })}
          <div style={{textAlign:"center",marginTop:12,fontSize:13,color:"rgba(255,255,255,0.4)"}}>
            Total: {workouts.reduce((s,w)=>s+w.duration,0)} min across {workouts.length} workout{workouts.length>1?"s":""}
          </div>
        </div>
      )}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>This Week</div>
        <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
          {last7.map(day => {
            const entry=history[day]; const ws=entry?.workouts||[];
            const totalMin=ws.reduce((s,w)=>s+(w.duration||0),0);
            const dayLabel=new Date(day+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"});
            const isToday=day===today;
            return (
              <div key={day} style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:10,color:isToday?"#81c784":"rgba(255,255,255,0.35)",fontWeight:isToday?700:500,marginBottom:6}}>{isToday?"Today":dayLabel}</div>
                <div style={{width:32,height:32,borderRadius:"50%",margin:"0 auto",background:ws.length>0?"rgba(66,165,245,0.2)":"rgba(255,255,255,0.04)",border:`2px solid ${ws.length>0?"#42a5f5":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:ws.length>0?"#42a5f5":"rgba(255,255,255,0.2)"}}>
                  {totalMin>0?`${totalMin}`:"—"}
                </div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:4}}>{totalMin>0?"min":""}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderInsights = () => {
    const entries=Object.entries(history).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
    const daysLogged=entries.length;
    const avgMood=entries.filter(([,e])=>e.mood>0).reduce((s,[,e])=>s+e.mood,0)/(entries.filter(([,e])=>e.mood>0).length||1);
    const avgEnergy=entries.filter(([,e])=>e.energy>0).reduce((s,[,e])=>s+e.energy,0)/(entries.filter(([,e])=>e.energy>0).length||1);
    const avgSleep=entries.filter(([,e])=>(e.sleepHours||0)>0).reduce((s,[,e])=>s+(e.sleepHours||0),0)/(entries.filter(([,e])=>(e.sleepHours||0)>0).length||1);
    const totalWorkoutsCount=entries.reduce((s,[,e])=>s+(e.workouts?.length||0),0);
    const fullDays=entries.filter(([,e])=>{const done=Object.keys(e.completed||{}).filter(k=>e.completed[k]).length;return done===(e.total||totalTasks);}).length;
    return (
      <div style={{padding:"0 24px"}}>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Overview (Last 14 Days)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[
              {label:"Days Logged",value:daysLogged,icon:"📅"},
              {label:"100% Days",value:fullDays,icon:"⭐"},
              {label:"Avg Mood",value:avgMood>0?avgMood.toFixed(1):"—",icon:"🙂"},
              {label:"Avg Energy",value:avgEnergy>0?avgEnergy.toFixed(1):"—",icon:"⚡"},
              {label:"Avg Sleep",value:avgSleep>0?avgSleep.toFixed(1)+"h":"—",icon:"😴"},
              {label:"Workouts",value:totalWorkoutsCount,icon:"🏋️"},
            ].map((item,i) => (
              <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:14,textAlign:"center",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{fontSize:20,marginBottom:2}}>{item.icon}</div>
                <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>{item.value}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:600,marginTop:2}}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Streaks</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,color:"rgba(255,255,255,0.7)"}}>🔥 All tasks complete</span>
              <span style={{fontSize:20,fontWeight:800,color:streak>0?"#ffb74d":"rgba(255,255,255,0.3)"}}>{streak} days</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:14,color:"rgba(255,255,255,0.7)"}}>💊 Medication adherence</span>
              <span style={{fontSize:20,fontWeight:800,color:medStreak>0?"#81c784":"rgba(255,255,255,0.3)"}}>{medStreak} days</span>
            </div>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Recent History</div>
          {entries.length===0&&<div style={{color:"rgba(255,255,255,0.4)",fontSize:14,textAlign:"center",padding:20}}>No data yet!</div>}
          {entries.slice(0,7).map(([date,entry]) => {
            const done=Object.keys(entry.completed||{}).filter(k=>entry.completed[k]).length;
            const total=entry.total||totalTasks; const pct=total>0?(done/total)*100:0;
            const dayLabel=new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
            return (
              <div key={date} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{fontSize:12,color:date===today?"#81c784":"rgba(255,255,255,0.5)",fontWeight:600,minWidth:80}}>{date===today?"Today":dayLabel}</div>
                <div style={{flex:1,height:6,background:"rgba(255,255,255,0.08)",borderRadius:3}}>
                  <div style={{width:`${pct}%`,height:"100%",borderRadius:3,background:pct===100?"#81c784":"#5c9ce6",transition:"width 0.3s"}}/>
                </div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",minWidth:32,textAlign:"right"}}>{done}/{total}</div>
                {entry.mood>0&&<span style={{fontSize:13}}>{["😞","😔","😐","🙂","😊"][entry.mood-1]}</span>}
                {(entry.sleepHours||0)>0&&<span style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{entry.sleepHours}h</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" rel="stylesheet"/>
      <Confetti active={showConfetti}/>
      <div style={styles.app}>
        <div style={styles.header}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:500}}>{user.email}</div>
            <button onClick={handleSignOut} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"4px 12px",color:"rgba(255,255,255,0.5)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
              Sign Out
            </button>
          </div>
          <div style={styles.greeting}>{getGreeting()}</div>
          <div style={styles.date}>{getDayName()}</div>
        </div>
        <div style={styles.nav}>
          {[["today","Today"],["mood","Mood"],["sleep","Sleep"],["workout","Workout"],["insights","Insights"]].map(([key,label]) => (
            <button key={key} style={styles.navBtn(view===key)} onClick={()=>setView(key)}>{label}</button>
          ))}
        </div>
        {view==="today"&&renderToday()}
        {view==="mood"&&renderMood()}
        {view==="sleep"&&renderSleep()}
        {view==="workout"&&renderWorkout()}
        {view==="insights"&&renderInsights()}
        {view==="today"&&percent===100&&(
          <div style={{textAlign:"center",padding:"20px 24px"}}>
            <div style={{fontSize:32,marginBottom:8}}>🌟</div>
            <div style={{fontSize:16,fontWeight:700,color:"#81c784"}}>Amazing — you did it all today!</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginTop:4}}>Every day you show up for yourself matters.</div>
          </div>
        )}
      </div>
    </>
  );
}
