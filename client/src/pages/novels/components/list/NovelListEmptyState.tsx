import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DIRECTOR_CREATE_LINK,
  MANUAL_CREATE_LINK,
  PRIMARY_CREATE_LABEL,
  SHORT_STORY_CREATE_LINK,
} from "./novelListViewModel";

export function NovelListEmptyState(props: {
  hasAnyNovel: boolean;
}) {
  return (
    <section className="py-12 text-center">
      <h2 className="text-xl font-semibold tracking-normal">
        {props.hasAnyNovel ? "There are no novels matching the filter criteria" : "No novel projects yet"}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        {props.hasAnyNovel
          ? "You can toggle the filters above, or create a new novel project."
          : "When using it for the first time, it is recommended to let the AI automatic director organize the direction, characters, world view and chapter preparation first."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to={DIRECTOR_CREATE_LINK}>{PRIMARY_CREATE_LABEL}</Link>
        </Button>
        {SHORT_STORY_CREATE_LINK ? (
          <Button asChild variant="secondary">
            <Link to={SHORT_STORY_CREATE_LINK}>Create short stories</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link to={MANUAL_CREATE_LINK}>Create a novel manually</Link>
        </Button>
      </div>
    </section>
  );
}
