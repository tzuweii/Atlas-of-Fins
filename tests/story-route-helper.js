import { SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID } from "../src/data.js";

export const CHAPTER_ONE_SCENE_IDS = [
  "keeper_returning_light",
  "keeper_two_habitats",
  "keeper_catch_destinations",
  "keeper_four_lights",
  "keeper_weather_surface",
  "keeper_outer_current_chart"
];

export function grantChapterOneRoute(state) {
  state.residentStories = {
    ...(state.residentStories || {}),
    lighthouse_keeper: {
      completedSceneIds: [...CHAPTER_ONE_SCENE_IDS],
      rewardIds: ["sleeping_tide_outer_chart"]
    }
  };
  state.world.unlockedRouteIds = [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID];
  return state;
}
