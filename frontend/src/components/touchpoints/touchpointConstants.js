import { Smile, Frown, Meh, Monitor, Building2, Mic, BookOpen, Tv, Briefcase } from 'lucide-react';

export const FUNNEL_PHASES = ["Topo de Funil", "Meio de Funil", "Fundo de Funil"];
export const ENVIRONMENTS = ["Online", "Offline"];

export const SENTIMENTS = [
  { value: "Feliz", icon: Smile, color: "text-green-500" },
  { value: "Neutro", icon: Meh, color: "text-yellow-500" },
  { value: "Triste", icon: Frown, color: "text-blue-500" },
  { value: "Frustrado", icon: Frown, color: "text-red-500" }
];

export const OFFLINE_TYPE_ICONS = {
  palestra: Mic,
  imersao: BookOpen,
  tv: Tv,
  mentoria: Briefcase
};

export const getScoreColor = (nota) => {
  if (nota <= 3) return { bg: "bg-red-500", text: "text-red-500", label: "Critico" };
  if (nota <= 6) return { bg: "bg-yellow-500", text: "text-yellow-500", label: "Atencao" };
  return { bg: "bg-green-500", text: "text-green-500", label: "Excelente" };
};

export const getROIColor = (roi) => {
  if (roi < 0) return "text-red-500";
  if (roi < 50) return "text-yellow-500";
  return "text-green-500";
};

export const getSentimentIcon = (sentiment) => {
  const found = SENTIMENTS.find(s => s.value === sentiment);
  return found || SENTIMENTS[1];
};
