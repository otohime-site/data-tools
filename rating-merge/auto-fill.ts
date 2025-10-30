import parseScores from "@otohime-site/parser/dx_intl/scores"
import { promises as fsPromises } from "fs"
import { DOMParser } from "linkedom"

const MANUAL_GAPS: string[] = []

const go = async () => {
  /* The whole picture:
    As the new DXNET now sorting level songs by internal level then category,
    we can now guess the internal level by the order of the song in the difficulty list.

    How this script will do:
    1. Given the song list from each categories, generate a name > category ID map
    2. Given the song list from level 12+ to 15, filling all internal level and output file
    3. Record songs for latest release and generate another file for that

    As of 2025, the only song name collision is "Link", which is Level 12 song
    and the internal lv JSON is not yet supported.
    This script will not work if other song name collision happens.

    If there is some "gap" after internal level guessing, it will also report.
  */
  // @ts-expect-error The DOMParser did not match the TypeScript definition
  globalThis.DOMParser = DOMParser

  const manualInternalLvs: Record<string, number> = JSON.parse(
    await fsPromises.readFile("../assets/internal_lvs/manual.json", "utf8"),
  )

  const newSongTitles = new Set(
    parseScores(
      await fsPromises.readFile("../assets/dxnet/circle.htm", "utf8"),
      undefined,
      true,
    ).map((score) => score.title),
  )
  const versionsLookup: string[][] = JSON.parse(
    await fsPromises.readFile("../assets/internal_lvs/versions.json", "utf8"),
  )
  const oldSongs = new Set(versionsLookup.flat())

  const masScores = parseScores(
    await fsPromises.readFile("../assets/dxnet/mas.htm", "utf8"),
    undefined,
    true,
  )
  const categoryMap: Map<string, number> = new Map()
  for (const score of masScores) {
    const prevCategory = categoryMap.get(score.title)
    if (
      prevCategory &&
      score.category !== prevCategory &&
      score.title !== "Link"
    ) {
      console.warn(
        `Song name collision detected: ${score.title},
        previously category ID: ${categoryMap.get(score.title)},
        purposed category ID: ${score.category}`,
      )
      continue
    }
    categoryMap.set(score.title, score.category)
  }

  const files = [
    "10",
    "10_plus",
    "11",
    "11_plus",
    "12",
    "12_plus",
    "13",
    "13_plus",
    "14",
    "14_plus",
    "15",
  ]
  // Avoid floating point accuracy issue by multiple with 10
  const baseInternalLvs = [
    100, 106, 110, 116, 120, 126, 130, 136, 140, 146, 150,
  ]
  const result: Record<string, number> = {}

  for (const [index, fileName] of files.entries()) {
    let internalLvToFill = baseInternalLvs[index]
    const nextInternalLv = baseInternalLvs[index + 1]
    let currentCategory = 1
    const scores = parseScores(
      await fsPromises.readFile(`../assets/dxnet/${fileName}.htm`, "utf8"),
      1 /* ignore category from the score */,
      true,
    )
    for (const score of scores) {
      // We cannot easily determine the category of "Link"
      // so we have to rely on the previous one (and hoping it will not appear in the first)
      const category =
        score.title !== "Link" ? categoryMap.get(score.title) : currentCategory
      if (!category) {
        console.warn(
          `Song ${score.title} not found in category map, skipping...`,
        )
        continue
      }
      if (category < currentCategory || MANUAL_GAPS.includes(score.title)) {
        internalLvToFill += 1
        if (internalLvToFill === nextInternalLv) {
          console.log(score.title)
          throw new Error(
            "Internal level overflow! Please check the original source.",
          )
        }
      }
      // Try to ignore songs out of international version
      if (
        newSongTitles.has(score.title) ||
        oldSongs.has(`${category}_${score.title}_${score.deluxe ? "t" : "f"}`)
      ) {
        result[
          `${category}_${score.title}_${score.deluxe ? "t" : "f"}_${
            score.difficulty
          }`
        ] = internalLvToFill / 10
      }
      currentCategory = category
    }
    if (nextInternalLv && internalLvToFill < nextInternalLv - 1) {
      console.warn(
        `After filling, the internal lv still have gap in ${fileName}`,
      )
    }
  }
  await fsPromises.writeFile(
    "../assets/internal_lvs/25_circle.json",
    JSON.stringify({ ...result, ...manualInternalLvs }, undefined, 2),
  )
}

go()
