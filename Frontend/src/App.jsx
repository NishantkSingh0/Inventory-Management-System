import Home from "./components/home";
import { Routes, Route, Navigate } from 'react-router-dom'
import { BrowserRouter } from "react-router-dom";


export default function App() {
  return (
    <>
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}
