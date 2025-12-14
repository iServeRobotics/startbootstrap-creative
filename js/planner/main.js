// ============================================================
// MAIN ENTRY POINT
// ============================================================
import Simulation from './simulation.js';

// Make Simulation available globally for button onclick handlers
window.Simulation = Simulation;

// Initialize and auto-start on page load
document.addEventListener('DOMContentLoaded', () => {
    Simulation.init();
    Simulation.start();
});
