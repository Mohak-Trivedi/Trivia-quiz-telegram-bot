import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_TRIVIABOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

let questions;
let currentQuestionIndex = 0;
let currentQuestion = null;
let awaitingAnswer = false;
let score = 0;

// Fetch questions from the API
const fetchQuestions = async () => {
  try {
    const response = await axios.get(
      "https://opentdb.com/api.php?amount=100&type=multiple"
    );
    questions = response.data.results; // Correctly access response data
  } catch (error) {
    console.error("Error while fetching questions:", error);
  }
};

// Fetch the questions when the bot starts
fetchQuestions();

// Matches "/start"
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Welcome! Please select the category of questions you'd like to answer.",
    {
      reply_markup: {
        keyboard: [
          ["Any category"],
          ["Entertainment: Video Games"],
          ["Entertainment: Japanese Anime & Manga"],
          ["Science: Computers", "Vehicles"],
          ["Geography", "Animals"],
          ["Entertainment: Comics"],
          ["Sports", "History"],
        ],
      },
    }
  );
});

// Helper function to shuffle array (used for options)
const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

// Function to send the next question
const sendQuestion = (chatId) => {
  if (currentQuestionIndex >= questions.length) {
    bot.sendMessage(
      chatId,
      `Quiz finished! Your final score is ${score}/${questions.length}.`
    );
    return; // End of the quiz
  }

  currentQuestion = questions[currentQuestionIndex];
  currentQuestionIndex++;

  const incorrectAnswers = currentQuestion.incorrect_answers;
  const allAnswers = [...incorrectAnswers, currentQuestion.correct_answer];
  const shuffledAnswers = shuffleArray(allAnswers);

  const optionsKeyboard = shuffledAnswers.map((answer) => [answer]);

  // Send the current question with answer options
  bot.sendMessage(chatId, currentQuestion.question, {
    reply_markup: {
      keyboard: optionsKeyboard,
      one_time_keyboard: true, // Use one-time keyboard for options
    },
  });

  awaitingAnswer = true; // Flag indicating we're waiting for an answer
};

// Listen for category selection and filter questions based on the selected category
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  let selectedCategory;
  if (msg.text !== "/start") selectedCategory = msg.text;

  // If we're awaiting an answer for the current question
  if (awaitingAnswer && currentQuestion) {
    awaitingAnswer = false; // Reset the flag after getting an answer

    const userAnswer = selectedCategory;
    const correctAnswer = currentQuestion.correct_answer;

    // Check if the user's answer is correct
    if (userAnswer === correctAnswer) {
      score++;
      bot.sendMessage(chatId, `Correct! 🎉 Your current score: ${score}`);
    } else {
      bot.sendMessage(
        chatId,
        `Wrong! 😢 The correct answer was: ${correctAnswer}.`
      );
    }

    // Move to the next question after a short delay
    setTimeout(() => {
      sendQuestion(chatId);
    }, 1500);

    return; // Stop processing further for this message
  }

  // Ensure this block only runs after category selection, not when "/start" is triggered
  if (questions && selectedCategory) {
    let filteredQuestions;

    // If the user selects "Any category", return all questions
    if (selectedCategory === "Any category") {
      filteredQuestions = questions;
    } else {
      // Filter questions based on the selected category
      filteredQuestions = questions.filter(
        (question) => question.category === selectedCategory
      );
    }

    if (filteredQuestions.length > 0) {
      bot.sendMessage(
        chatId,
        `You have selected ${selectedCategory} category. Let's begin the quiz!`
      );
      questions = filteredQuestions; // Update the global `questions` with filtered questions
      currentQuestionIndex = 0; // Reset question index for the quiz
      score = 0; // Reset score for the new quiz

      // Send the first question
      sendQuestion(chatId);
    } else {
      bot.sendMessage(
        chatId,
        `No questions available for the selected category: ${selectedCategory}.`
      );
    }
  }
});
