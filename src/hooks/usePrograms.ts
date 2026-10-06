// RN equivalent of gymtrack-web's ProgramService constructor subscribe(): programs are a public
// collection (no per-user filter, just like exercises/exerciseBundles).
import { useEffect, useState } from "react";
import type { TrainingProgram } from "../core/models/workout.model";
import { subscribe } from "../core/services/firestore.service";
import { PROGRAMS_COLLECTION, sortProgramsByUpdated } from "../core/services/program.service";

export function usePrograms() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);

  useEffect(() => {
    return subscribe<TrainingProgram>(PROGRAMS_COLLECTION, (docs) => {
      setPrograms(sortProgramsByUpdated(docs));
    });
  }, []);

  return { programs };
}
