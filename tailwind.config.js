/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./script.js", // Ensure this includes the script if you're using dynamic classes
    // Add other paths as necessary
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}