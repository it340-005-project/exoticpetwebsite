/**
 * @typedef {Object} QuizQuestion
 * @property {string} animal
 * @property {string} q
 * @property {string[]} options
 * @property {number} correct
 * @property {string} explain
 */

/** @type {QuizQuestion[]} */
const QUIZ = [
  {
    animal: "Blue-Tongued Skink",
    q: "What temperature range does a blue-tongued skink need on the cool side?",
    options: ["75–85°F", "55–60°F", "100–110°F", "Room temperature with no gradient"],
    correct: 0,
    explain: "The cool side should be 75–85°F, with a basking spot of 90–100°F.",
  },
  {
    animal: "Panther Chameleon",
    q: "How do panther chameleons usually drink?",
    options: ["From a deep water bowl only", "Water droplets from misting or a drip", "They do not need water", "Only from fruit"],
    correct: 1,
    explain: "Chameleons drink water droplets, so daily misting or a drip system is required.",
  },
  {
    animal: "Ball Python",
    q: "What should a ball python be fed?",
    options: ["Live prey only", "Pre-killed or frozen/thawed rodents", "Insects dusted with calcium", "Leafy greens"],
    correct: 1,
    explain: "Feed pre-killed or frozen/thawed mice or rats. Never feed live prey.",
  },
  {
    animal: "Sulcata Tortoise",
    q: "Which diet fits a sulcata tortoise best?",
    options: ["Mostly meat", "High-fiber grasses and weeds, limited fruit", "Only fruit", "Cat food"],
    correct: 1,
    explain: "Sulcatas are grazers and need a high-fiber plant diet, not rich fruit or meat.",
  },
  {
    animal: "Sugar Glider",
    q: "Why do sugar gliders need company?",
    options: ["They are solitary", "They are social and can suffer alone", "They only pair during winter", "They should live with cats"],
    correct: 1,
    explain: "Sugar gliders are colony animals and should not be kept alone.",
  },
  {
    animal: "Capuchin Monkey",
    q: "What kind of commitment is a capuchin monkey?",
    options: ["A short beginner pet", "A decades-long expert commitment that may be illegal without permits", "The same care as a house cat", "An animal that needs no enrichment"],
    correct: 1,
    explain: "Capuchins can live for decades, need expert care, and are illegal to keep in many places.",
  },
];

/** @type {Array<number|null>} */
let userAnswers = [];
let currentQ = 0;

/**
 * @param {string} name
 */
function showState(name) {
  ["state-intro", "state-question", "state-result"].forEach((id) => {
    byId(id).classList.toggle("is-active", id === name);
  });
}

function renderIntro() {
  const passNeeded = 5;
  byId("state-intro").innerHTML =
    '<div class="quiz-intro">' +
    '<span class="quiz-badge">Buyer Screening</span>' +
    "<h1>Exotic Pet Care Quiz</h1>" +
    "<p>This quiz is just for fun. It is not required for checkout. Answer <strong>" + passNeeded + " out of " + QUIZ.length + "</strong> questions correctly to pass.</p>" +
    '<div class="quiz-btn-row"><a href="/care-guide" class="btn-outline">Study Care Guide</a>' +
    '<button class="btn-primary" id="start-quiz" type="button">Start Quiz</button></div></div>';
  const start = document.getElementById("start-quiz");
  if (start) start.addEventListener("click", startQuiz);
  showState("state-intro");
}

function startQuiz() {
  userAnswers = QUIZ.map(() => null);
  currentQ = 0;
  renderQuestion();
}

function renderQuestion() {
  const question = QUIZ[currentQ];
  if (!question) return;
  const pctClass = "pct-" + String(currentQ + 1);
  const isLast = currentQ === QUIZ.length - 1;
  const options = question.options.map((opt, index) => (
    '<button class="quiz-option' + (userAnswers[currentQ] === index ? " selected" : "") + '" type="button" data-choice="' + index + '">' +
    '<span class="option-letter">' + String.fromCharCode(65 + index) + "</span>" + escapeHTML(opt) + "</button>"
  )).join("");
  byId("state-question").innerHTML =
    '<div class="quiz-question-wrap">' +
    '<div class="quiz-progress-label">Question ' + (currentQ + 1) + " of " + QUIZ.length + "</div>" +
    '<div class="quiz-progress-bar"><div class="quiz-progress-fill ' + pctClass + '"></div></div>' +
    '<span class="quiz-animal-tag">' + escapeHTML(question.animal) + "</span>" +
    '<div class="quiz-q-text">' + escapeHTML(question.q) + "</div>" +
    '<div class="quiz-options">' + options + "</div>" +
    '<div class="quiz-nav">' +
    (currentQ > 0 ? '<button class="btn-back" id="quiz-prev" type="button">Previous</button>' : "<div></div>") +
    '<button class="btn-primary" id="quiz-next" type="button">' + (isLast ? "Submit Quiz" : "Next") + "</button></div></div>";
  byId("state-question").querySelectorAll(".quiz-option").forEach((node) => {
    node.addEventListener("click", () => {
      if (!(node instanceof HTMLButtonElement)) return;
      userAnswers[currentQ] = Number(node.dataset.choice);
      renderQuestion();
    });
  });
  const prev = document.getElementById("quiz-prev");
  if (prev) prev.addEventListener("click", () => { currentQ -= 1; renderQuestion(); });
  const next = document.getElementById("quiz-next");
  if (next) next.addEventListener("click", () => {
    if (userAnswers[currentQ] === null) {
      window.alert("Please select an answer before continuing.");
      return;
    }
    if (currentQ < QUIZ.length - 1) {
      currentQ += 1;
      renderQuestion();
    } else {
      renderResult();
    }
  });
  showState("state-question");
}

function renderResult() {
  let score = 0;
  const review = QUIZ.map((question, index) => {
    const yours = userAnswers[index];
    const isCorrect = yours === question.correct;
    if (isCorrect) score += 1;
    return { question, yours, isCorrect };
  });
  const passed = score >= 5;
  const rows = review.map(({ question, yours, isCorrect }) => (
    '<div class="answer-row ' + (isCorrect ? "correct" : "wrong") + '">' +
    '<span class="answer-icon">' + (isCorrect ? "OK" : "No") + "</span><div>" +
    '<div class="answer-animal">' + escapeHTML(question.animal) + "</div>" +
    '<div class="answer-q">' + escapeHTML(question.q) + "</div>" +
    (isCorrect ? "" : '<div class="answer-yours">Your answer: ' + escapeHTML(question.options[yours ?? 0] || "") + "</div>") +
    '<div class="answer-correct">Correct: ' + escapeHTML(question.options[question.correct] || "") + "</div>" +
    '<div class="answer-explain">' + escapeHTML(question.explain) + "</div></div></div>"
  )).join("");
  byId("state-result").innerHTML =
    '<div class="quiz-result-wrap"><div class="result-icon">' + (passed ? "Pass" : "Review") + "</div>" +
    '<h2 class="' + (passed ? "passed" : "failed") + '">' + (passed ? "You Passed!" : "Not Quite There") + "</h2>" +
    '<div class="score-display">' + score + " / " + QUIZ.length + "</div>" +
    '<p class="result-msg">' + (passed
      ? "Nice work. This quiz is only for practice and is not part of checkout."
      : "You need at least 5 correct answers. Review the care guide and try again.") + "</p>" +
    '<div class="answers-review">' + rows + "</div>" +
    '<div class="result-actions"><a href="/care-guide" class="btn-outline">Study Care Guide</a>' +
    '<button class="btn-primary" id="quiz-retry" type="button">Try Again</button></div></div>';
  const retry = document.getElementById("quiz-retry");
  if (retry) retry.addEventListener("click", renderIntro);
  showState("state-result");
}

document.addEventListener("DOMContentLoaded", renderIntro);
