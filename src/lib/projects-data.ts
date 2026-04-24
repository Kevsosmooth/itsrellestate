export type ProjectStatus = "upcoming" | "current" | "completed";

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly borough: string;
  readonly type: string;
  readonly units: number;
  readonly year: number;
  readonly image: string;
  readonly description: string;
  readonly programs: readonly string[];
  readonly status: ProjectStatus;
}

export const PROJECTS: readonly Project[] = [
  {
    id: "bronx-concourse-village",
    name: "Concourse Village Towers",
    address: "750 Grand Concourse",
    borough: "The Bronx",
    type: "Multi-Family High-Rise",
    units: 48,
    year: 2025,
    image: "/images/projects/bronx-concourse-village.jpg",
    description:
      "A 48-unit high-rise development with modern amenities. Managed tenant placement across multiple subsidy programs.",
    programs: ["CityFHEPS", "Section 8"],
    status: "upcoming",
  },
  {
    id: "bronx-morris-heights",
    name: "Morris Heights Residences",
    address: "1880 University Ave",
    borough: "The Bronx",
    type: "Multi-Family Walk-Up",
    units: 24,
    year: 2026,
    image: "/images/projects/bronx-morris-heights.jpg",
    description:
      "A renovated 24-unit walk-up blending classic Bronx architecture with updated interiors. Full tenant placement and landlord coordination.",
    programs: ["CityFHEPS", "HASA"],
    status: "upcoming",
  },
  {
    id: "queens-forest-hills",
    name: "Metropolitan Commons",
    address: "98-40 Metropolitan Ave",
    borough: "Queens",
    type: "Mixed-Use Mid-Rise",
    units: 36,
    year: 2026,
    image: "/images/projects/queens-forest-hills.jpg",
    description:
      "A 36-unit mixed-use mid-rise in Forest Hills. Ground-floor retail with residential above. Coordinated placements across CityFHEPS and Section 8.",
    programs: ["CityFHEPS", "Section 8"],
    status: "upcoming",
  },
] as const;
