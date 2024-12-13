// views/homePage.js
import { Hero } from "../components/Hero.js";

export function Home() {
  const container = document.createElement("div");
  container.className = "container mt-5";

  // Append the hero section
  const hero = Hero();
  container.appendChild(hero);

  return container;
}
