// JavaScript for handling memory clicks
document.addEventListener("DOMContentLoaded", () => {
    // Select all memory elements
    const memories = document.querySelectorAll(".memory");
  
    memories.forEach((memory) => {
      memory.addEventListener("click", () => {
        // Toggle the visibility of the overlay on click
        const overlay = memory.querySelector(".memory-overlay");
        if (overlay) {
          overlay.classList.toggle("hidden");
        }
      });
    });
  });
  