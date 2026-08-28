/* Runs before paint so the reveal effect can start hidden.
   Without JS the class is never added and every .reveal stays visible. */
document.documentElement.classList.add("js");
