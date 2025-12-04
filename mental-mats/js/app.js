// app.js - générateur d'exercices & logique
(() => {
  // Conseils pédagogiques selon le type d'exercice
const adviceMap = {
  addition: [
    "Utilise la décomposition : 47 + 28 = 47 + 20 + 8.",
    "Cherche des compléments à 10 pour aller plus vite.",
    "Additionne d'abord les dizaines, puis les unités."
  ],
  subtraction: [
    "Pense au calcul en avançant : 52 - 19 = 52 - 20 + 1.",
    "Transforme en addition si nécessaire : a - b = ? ⇔ b + ? = a.",
    "Soustraire 9 revient à soustraire 10 puis ajouter 1."
  ],
  multiplication: [
    "Décompose : 14 × 6 = (10×6) + (4×6).",
    "Utilise les doubles : 12 × 4 = double de 12 × 2.",
    "Priorise les tables connues puis ajuste."
  ],
  division: [
    "Transforme en multiplication : a ÷ b ⇔ quel nombre × b donne a ?",
    "Vérifie mentalement avec b × résultat.",
    "Réduis les deux nombres si possible (divise par 10, 2...)."
  ],
  tables: [
    "Visualise la table : 7×8 = 56 doit être immédiat.",
    "Utilise les symétries : 8×7 = 7×8.",
    "Apprends les carrés (6×6, 7×7, 8×8...) pour aller plus vite."
  ],
  complements: [
    "Concentre-toi sur les compléments à 10, 20 et 100.",
    "Exemple : pour 100 − 37, pense : 3 pour aller à 40, puis 60 = 63.",
    "Travaille la visualisation sur la droite des nombres."
  ],
  mixed: [
    "Repère les priorités : × et ÷ avant + et −.",
    "Essaie d’estimer l’ordre de grandeur avant de calculer.",
    "Simplifie mentalement : 12×5 = 10×5 + 2×5."
  ],
  default: [
    "Décompose les nombres pour faciliter le calcul.",
    "Essaie toujours une estimation rapide avant de répondre."
  ]
};

  const startBtn = document.getElementById('start-btn');
  const nextBtn = document.getElementById('next-btn');
  const typeSel = document.getElementById('exercise-type');
  const levelRange = document.getElementById('level');
  const durationInput = document.getElementById('duration');
  const timerEl = document.getElementById('timer');
  const questionEl = document.getElementById('question');
  const answerInput = document.getElementById('answer');
  const feedback = document.getElementById('feedback');
  const scoreEl = document.getElementById('score');
  const historyList = document.getElementById('history-list');

  let timerId = null;
  let timeLeft = 60;
  let score = 0, mistakes = 0;
  let current = null;
  let running = false;

  function pad(n){ return String(n).padStart(2,'0'); }

  function setTimerDisplay(sec){
    timerEl.textContent = `${pad(Math.floor(sec/60))}:${pad(sec%60)}`;
  }

  function randInt(min, max){
    return Math.floor(Math.random()*(max-min+1))+min;
  }

  function getBounds(level){
    // Niveau: 1..5, retourne borne basse/haute pour opérandes
    const map = {
      1: [0,10],
      2: [0,20],
      3: [0,50],
      4: [0,200],
      5: [ -100, 500 ]
    };
    return map[level] || map[2];
  }

  function genQuestion(type, level){
    const [aMin,aMax] = getBounds(level);
    // helpers
    const a = () => randInt(aMin, aMax);
    const b = () => randInt(aMin, aMax);

    if(type === 'addition'){
      const x=a(), y=b();
      return { text:`${x} + ${y} = ?`, answer: x+y };
    }
    if(type === 'subtraction'){
      const x = randInt(Math.max(0,aMin), aMax);
      const y = randInt(0, x); // éviter négatifs souvent
      return { text:`${x} - ${y} = ?`, answer: x-y };
    }
    if(type === 'multiplication'){
      // réduire facteurs sur bas niveaux
      const [min,max] = level <= 2 ? [0,12] : [aMin,aMax];
      const x = randInt(min, Math.min(max, 50));
      const y = randInt(0, level<=2?12:20);
      return { text:`${x} × ${y} = ?`, answer: x*y };
    }
    if(type === 'division'){
      const divisor = randInt(1, level<=2?12:30);
      const quotient = randInt(0, level<=2?12:20);
      const dividend = divisor * quotient;
      return { text:`${dividend} ÷ ${divisor} = ?`, answer: quotient };
    }
    if(type === 'tables'){
      const n = randInt(2, 12);
      const k = randInt(1, level<=2?10:20);
      return { text:`Table: ${n} × ${k} = ?`, answer: n*k };
    }
    if(type === 'complements'){
      const base = level <= 2 ? 10 : 100;
      const x = randInt(0, base-1);
      return { text:`Complément à ${base} : ${base} - ${x} = ?`, answer: base-x };
    }
    if(type === 'mixed'){
      // petit mix: a op b op c, priorité
      const x = randInt(1, level<=2?10:50);
      const y = randInt(1, level<=2?10:50);
      const z = randInt(1, level<=2?10:50);
      // choisi aléatoirement la combinaison
      const ops = ['+','-','*'];
      const op1 = ops[randInt(0, ops.length-1)];
      const op2 = ops[randInt(0, ops.length-1)];
      const expr = `${x} ${op1} ${y} ${op2} ${z}`;
      // eslint-disable-next-line no-eval
      const ans = Math.round(eval(expr)); // okay pour expressions contrôlées
      return { text: `${expr} = ?`, answer: ans };
    }

    // fallback
    return genQuestion('addition', level);
  }

  function newQuestion(){
    const type = typeSel.value;
    const level = parseInt(levelRange.value,10);
    current = genQuestion(type, level);
    questionEl.textContent = current.text;
    answerInput.value = '';
    feedback.textContent = '';
    answerInput.focus();
  }

  function generateAdviceForQuestion(questionObj) {
  const { text, answer } = questionObj;

  // Extraction simple des nombres et opérateurs
  const expr = text.replace("= ?", "").trim();
  let advice = "";

  // Détecter les opérations
  if (expr.includes(" + ")) {
    const [a, b] = expr.split(" + ").map(Number);
    advice =
      `Décompose : ${a} + ${b} = ${a} + ${Math.floor(b/10)*10} + ${b%10}. ` +
      `Ici : ${a} + ${b} = ${a + Math.floor(b/10)*10} + ${b%10}.`;
  }

  else if (expr.includes(" - ")) {
    const [a, b] = expr.split(" - ").map(Number);
    advice =
      `Pense “-${b} = -${b+1} +1” : soustrais ${b+1} puis ajoute 1. ` +
      `Ici : ${a} - ${b} = ${a - (b+1)} + 1.`;
  }

  else if (expr.includes("×") || expr.includes("*")) {
    const clean = expr.replace("×", "*");
    const [a, b] = clean.split("*").map(Number);
    advice =
      `Décompose : ${a}×${b} = (${a}×${Math.floor(b/2)})×2 ou en dizaines : ` +
      `${a}×${b} = ${a}×${Math.floor(b/10)*10} + ${a}×${b%10}.`;
  }

  else if (expr.includes("÷") || expr.includes("/")) {
    const clean = expr.replace("÷", "/");
    const [a, b] = clean.split("/").map(Number);
    advice =
      `Transforme en multiplication : combien faut-il pour que ${b}×? = ${a} ? ` +
      `Ici ${b}×${answer} = ${a}.`;
  }

  else if (text.includes("Complément")) {
    const base = parseInt(text.match(/\d+/)[0], 10);
    const x = parseInt(text.match(/- (\d+)/)[1], 10);
    advice =
      `Utilise la technique des paliers : ${x} → ${Math.ceil(x/10)*10} puis jusqu’à ${base}.`;
  }

  else if (text.includes("Table")) {
    const [n, k] = text.match(/\d+/g).map(Number);
    advice =
      `Retient cette paire clé : ${n}×${k} = ${answer}. Décompose si besoin : ` +
      `${n}×${k} = ${n}×${Math.floor(k/2)}×2.`;
  }

  else if (expr.match(/[+\-*]/g)?.length > 1) {
    advice = "Rappelle-toi des priorités : × et ÷ avant + et −. Simplifie d’abord par étapes.";
  }

  else {
    advice = "Décompose les nombres pour simplifier mentalement.";
  }

  return advice;
}


 function addHistory(entry, type, questionObj) {
  const li = document.createElement('li');

  // Conseil intelligent basé sur la question réelle
  const advice = generateAdviceForQuestion(questionObj);

  li.innerHTML = `
    <div>${entry}</div>
    <div class="advice">💡 ${advice}</div>
  `;

  historyList.prepend(li);

  if (historyList.children.length > 50)
    historyList.removeChild(historyList.lastChild);
}



  function updateScore(){
    scoreEl.textContent = `Score: ${score} ✅  Erreurs: ${mistakes} ❌`;
  }

  function endSession(){
    running = false;
    clearInterval(timerId);
    timerId = null;
    startBtn.textContent = 'Démarrer';
    nextBtn.classList.add('hidden');
    feedback.textContent = `Session terminée — Score: ${score}.`;
  }

  function startSession(){
    score = 0; mistakes = 0;
    updateScore();
    timeLeft = Math.max(10, parseInt(durationInput.value,10) || 60);
    setTimerDisplay(timeLeft);
    startBtn.textContent = 'Arrêter';
    nextBtn.classList.remove('hidden');
    running = true;
    newQuestion();

    timerId = setInterval(()=>{
      timeLeft--;
      setTimerDisplay(timeLeft);
      if(timeLeft <= 0){
        endSession();
      }
    }, 1000);
  }

  // Events
  startBtn.addEventListener('click', ()=>{
    if(running){ endSession(); return; }
    startSession();
  });

  nextBtn.addEventListener('click', ()=> newQuestion());

  answerInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      if(!current) return;
      const val = answerInput.value.trim();
      if(val === '') return;
      // accept integer or float
      const numeric = Number(val.replace(',', '.'));
      if(Number.isNaN(numeric)){
        feedback.textContent = 'Réponse non reconnue';
        return;
      }
      // compare with tolerance for float
      const ok = Math.abs(numeric - current.answer) < 1e-6;
      if(ok){
  score++;
  feedback.textContent = '✅ Correct';

  // Appel modifié : on envoie aussi current
  addHistory(
    `${current.text} → ${current.answer} ✅`,
    typeSel.value,
    current
  );

} else {
  mistakes++;
  feedback.textContent = `❌ Faux — Réponse: ${current.answer}`;

  // Appel modifié : on envoie aussi current
  addHistory(
    `${current.text} → ${numeric} ❌ (attendu ${current.answer})`,
    typeSel.value,
    current
  );
}


      updateScore();
      // auto-next
      setTimeout(()=> {
        if(running) newQuestion();
      }, 400);
    }
  });

  // small accessibility improvement: focus answer on click anywhere in question area
  document.getElementById('question-area').addEventListener('click', ()=> answerInput.focus());

  // init
  setTimerDisplay(parseInt(durationInput.value,10));
})();
