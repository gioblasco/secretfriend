import { Navigate, Route, Routes } from "react-router-dom";
import { Home } from "./routes/Home";
import { Result } from "./routes/Result";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/r" element={<Result />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

