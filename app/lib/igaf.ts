export type Student = { id: number; name: string; semester3: string[]; semester4: string[]; credits: number };
export type ExamStatus = "todo" | "done" | "missed";

export const schedule = [
  { date:"2026-09-07", label:"Lun. 7 sept.", courses:["Administration Réseau","Programmation Desktop"] },
  { date:"2026-09-08", label:"Mar. 8 sept.", courses:["Introduction à la comptabilité des sociétés","Introduction au management des organisations"] },
  { date:"2026-09-09", label:"Mer. 9 sept.", courses:["Base de données","Développement Mobile"] },
  { date:"2026-09-10", label:"Jeu. 10 sept.", courses:["Programmation web 2","Conception Réseau"] },
  { date:"2026-09-11", label:"Ven. 11 sept.", courses:["Anglais des affaires 1","Anglais des Affaires 2"] },
  { date:"2026-09-12", label:"Sam. 12 sept.", courses:["Réseau informatique","Méthode d'analyse informatique"] },
  { date:"2026-09-14", label:"Lun. 14 sept.", courses:["Génie Logiciel","Bases de Données Réparties"] },
  { date:"2026-09-15", label:"Mar. 15 sept.", courses:["Anglais informatique 1","Intégrales et équations différentielles"] },
  { date:"2026-09-16", label:"Mer. 16 sept.", courses:["Langage de programmation 2","Anglais Informatique 2"] },
  { date:"2026-09-17", label:"Jeu. 17 sept.", courses:["Télécommunication et sécurité informatique","Télécommunications"] },
  { date:"2026-09-18", label:"Ven. 18 sept.", courses:["Recherche Opérationnelle","Algorithme et structure des données"] },
  { date:"2026-09-19", label:"Sam. 19 sept.", courses:["Conception  des systèmes d'informatiques","PROJET TUTORES"] },
  { date:"2026-09-21", label:"Lun. 21 sept.", courses:["Analyse mathématique"] },
] as const;

export const courseAliases: Record<string,string[]> = {
  "Administration Réseau":["administration reseau"], "Programmation Desktop":["programmation desktop","developpement desktop"],
  "Introduction à la comptabilité des sociétés":["introduction a la comptabilite des societes","intro comptabilite des societes"],
  "Introduction au management des organisations":["introduction au management des organisations","intro au management"],
  "Base de données":["base de donnees"], "Développement Mobile":["developpement mobile"],
  "Programmation web 2":["programmation web 2","programmation web ii"], "Conception Réseau":["conception reseau","conception reseau informatique"],
  "Anglais des affaires 1":["anglais des affaires 1","anglais des affaires i"], "Anglais des Affaires 2":["anglais des affaires 2","anglais des affaires ii"],
  "Réseau informatique":["reseau informatique"], "Méthode d'analyse informatique":["methode d analyse informatique","methode analyse informatique"],
  "Génie Logiciel":["genie logiciel"], "Bases de Données Réparties":["bases de donnees reparties","base des donnees reparties"],
  "Anglais informatique 1":["anglais informatique 1","anglais informatique i"], "Intégrales et équations différentielles":["integrales et equations differentielles","equation differentielle"],
  "Langage de programmation 2":["langage de programmation 2","langage de programmation ii"], "Anglais Informatique 2":["anglais informatique 2","anglais informatique ii"],
  "Télécommunication et sécurité informatique":["telecommunication et securite informatique","securite informatique"], "Télécommunications":["telecommunications","telecommunication"],
  "Recherche Opérationnelle":["recherche operationnelle"], "Algorithme et structure des données":["algorithme et structure des donnees"],
  "Conception  des systèmes d'informatiques":["conception des systemes d informatiques","systeme d information"], "PROJET TUTORES":["projet tutores","projet tutore"],
  "Analyse mathématique":["analyse mathematique","mathematique numerique"],
};

export function normalize(value:string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g," ").trim().toLowerCase(); }
export function matchesStudentName(name:string, query:string) {
  const n = normalize(name);
  const q = normalize(query);
  if (q.length < 2) return false;
  if (n.includes(q)) return true;
  const parts = q.split(" ").filter(Boolean);
  return parts.length > 0 && parts.every((part) => n.includes(part));
}
export function baseCourse(value:string) { return value.replace(/\s*\(\d+\s*cr\.\)\s*$/i,"").trim(); }
export function examFor(course:string) {
  const c = normalize(baseCourse(course));
  for (const day of schedule) for (const official of day.courses) {
    if (normalize(official) === c || (courseAliases[official] ?? []).some(a => normalize(a) === c)) return { ...day, official };
  }
  return null;
}
