/** @type {import('tailwindcss').Config} */
const { heroui } = require("@heroui/react");
import { nextui } from "@nextui-org/react"; 
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [
    
    heroui(),
    nextui(),

    require("tailwind-scrollbar-hide"),



  ],
}

