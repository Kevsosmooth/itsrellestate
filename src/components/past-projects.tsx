"use client";

import { useState } from "react";
import Image from "next/image";
import { BlurFade } from "@/components/ui/blur-fade";
import { PROJECTS, type Project } from "@/lib/projects-data";

const PROGRAM_BADGE: Record<string, string> = {
  CityFHEPS: "bg-primary/10 text-primary",
  "Section 8": "bg-secondary/10 text-secondary",
  HASA: "bg-success/10 text-success",
};

const STATS = [
  { value: "3+", label: "Buildings Completed" },
  { value: "100+", label: "Units Placed" },
  { value: "3", label: "Boroughs Served" },
] as const;

function ProjectCard({ project }: { project: Project }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="w-full cursor-pointer [perspective:1000px]"
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${project.name} — click to ${flipped ? "see photo" : "read the story"}`}
    >
      <div
        className="relative w-full aspect-[3/4] md:aspect-[4/5] transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front -- building photo */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl bg-card shadow-card overflow-hidden flex flex-col">
          <div className="relative flex-1">
            <Image
              src={project.image}
              alt={`${project.name}, ${project.borough}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground backdrop-blur-sm">
                {project.type}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-dark/70 text-text-on-dark backdrop-blur-sm">
                {project.borough}
              </span>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-base font-semibold text-text-primary">
              {project.name}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {project.address}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-text-muted">{project.units} units</p>
              <p className="flex items-center gap-1.5 text-xs text-text-muted">
                <span className="inline-block w-2 h-2 rounded-full bg-success" />
                Completed {project.year}
              </p>
            </div>
          </div>
        </div>

        {/* Back -- editorial story */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl shadow-card overflow-hidden flex flex-col">
          <div className="bg-primary px-6 pt-6 pb-5 rounded-t-2xl">
            <h3 className="text-lg font-semibold text-text-on-dark">
              {project.name}
            </h3>
            <p className="mt-1 text-sm uppercase tracking-wide text-text-on-dark/70">
              {project.borough}
            </p>
          </div>

          <div className="flex-1 bg-card px-6 pt-6 pb-4 flex flex-col">
            <p className="text-base text-text-secondary leading-relaxed">
              {project.description}
            </p>

            <div className="mt-auto pt-6 border-t border-surface">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-primary">
                    {project.units}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-text-muted">
                    Units
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-primary">
                    {project.year}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-text-muted">
                    Year
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-primary">
                    {project.type.split(" ")[0]}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-text-muted">
                    Type
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface px-6 py-4 rounded-b-2xl flex flex-wrap items-center gap-2">
            {project.programs.map((program) => (
              <span
                key={program}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${PROGRAM_BADGE[program] ?? "bg-primary/10 text-primary"}`}
              >
                {program}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PastProjects() {
  return (
    <section id="recent-placements" className="bg-surface py-14 md:py-20">
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12">
        <BlurFade delay={0.1} duration={0.5} inView>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
              Recent Projects
            </h2>
            <p className="mt-3 text-base md:text-lg text-text-secondary max-w-xl mx-auto">
              From high-rises to walk-ups, every building tells a story.
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.2} duration={0.4} inView>
          <div className="mt-8 flex items-center justify-center gap-6 md:gap-10">
            {STATS.map((stat, index) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center text-center ${
                  index < STATS.length - 1
                    ? "pr-6 md:pr-10 border-r border-border"
                    : ""
                }`}
              >
                <span className="text-2xl md:text-3xl font-bold text-primary">
                  {stat.value}
                </span>
                <span className="mt-1 text-xs md:text-sm text-text-secondary">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </BlurFade>

        <div className="mt-12 md:mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PROJECTS.map((project, index) => (
            <BlurFade
              key={project.id}
              delay={0.3 + index * 0.15}
              duration={0.4}
              inView
            >
              <ProjectCard project={project} />
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
