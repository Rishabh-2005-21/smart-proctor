import { createContext, useContext, useState } from "react";

const QuizContext = createContext();

export const QuizProvider = ({ children }) => {
  // 🔹 Assigned Tests
  const [tests, setTests] = useState([]);

  // 🔹 Current Active Quiz
  const [currentQuiz, setCurrentQuiz] = useState(null);

  // 🔹 Current Question Index
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // 🔹 Student Answers
  const [answers, setAnswers] = useState({});

  // 🔹 Violation Count
  const [violations, setViolations] = useState(0);

  // =============================
  // ✅ FUNCTIONS
  // =============================

  const loadTests = (data) => {
    setTests(data);
  };

  const startQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setCurrentQuestion(0);
    setAnswers({});
    setViolations(0);
  };

  const submitAnswer = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const nextQuestion = () => {
    if (currentQuiz && currentQuestion < currentQuiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const addViolation = () => {
    setViolations((prev) => prev + 1);
  };

  const resetQuiz = () => {
    setCurrentQuiz(null);
    setCurrentQuestion(0);
    setAnswers({});
    setViolations(0);
  };

  return (
    <QuizContext.Provider
      value={{
        tests,
        currentQuiz,
        currentQuestion,
        answers,
        violations,
        loadTests,
        startQuiz,
        submitAnswer,
        nextQuestion,
        previousQuestion,
        addViolation,
        resetQuiz,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

// 🔹 Custom Hook
export const useQuiz = () => useContext(QuizContext);
