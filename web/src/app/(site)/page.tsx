import { Hero } from "@/components/hero/Hero";
import { getPortfolio } from "@/lib/content";
import { SignalStrip } from "@/components/sections/SignalStrip";
import { About } from "@/components/sections/About";
import { ProjectUniverse } from "@/components/sections/ProjectUniverse";
import { SkillConstellation } from "@/components/sections/SkillConstellation";
import { ExperienceTimeline } from "@/components/sections/ExperienceTimeline";
import { Beyond } from "@/components/sections/Beyond";
import { Contact } from "@/components/sections/Contact";

export default async function HomePage() {
  const content = await getPortfolio();

  return (
    <>
      <Hero content={content} />
      <SignalStrip profile={content.profile} />
      <About content={content} />
      <ProjectUniverse projects={content.projects} />
      <SkillConstellation categories={content.skills} toolkit={content.toolkit} projects={content.projects} />
      <ExperienceTimeline experience={content.experience} certifications={content.certifications} />
      <Beyond content={content} />
      <Contact profile={content.profile} />
    </>
  );
}
