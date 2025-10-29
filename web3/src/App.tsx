import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import HardHat from "./HardHat.js"
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <HardHat/>
  )
}

export default App
