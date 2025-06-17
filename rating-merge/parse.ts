import { promises as fsPromises } from "fs";
import { DOMParser } from "linkedom";
import parseScores from "@otohime-site/parser/dx_intl/scores";

import papaparse from "papaparse";
const { unparse } = papaparse;

const diffs = ["bsc", "adv", "exp", "mas", "rem"];

const go = async () => {
  const content = await fsPromises.readFile("internal_lv_prism.json", {
    encoding: "utf-8",
  });
  const previousResult: Record<string, number> = JSON.parse(content);

  // @ts-expect-error The DOMParser did not match the TypeScript definition
  globalThis.DOMParser = DOMParser

  const newSongTitles = new Set(
    parseScores(
      await fsPromises.readFile("dxnet/prism.htm", "utf8"),
      undefined,
      true
    ).map((score) => score.title)
  );

  const files = ["dxnet/exp.htm", "dxnet/mas.htm", "dxnet/rem.htm"];

  let result: Array<string | number>[] = [];
  for (const fileName of files) {
    const scores = parseScores(
      await fsPromises.readFile(fileName, "utf8"),
      undefined,
      true
    );
    result = [
      ...result,
      ...scores
        .filter((score) =>
          ["12+", "13", "13+", "14", "14+", "15"].includes(score.level)
        )
        .map((score) => [
          score.level,
          score.category,
          score.title,
          score.deluxe ? "dx" : "std",
          diffs[score.difficulty],
          previousResult[
            `${score.category}_${score.title}_${score.deluxe ? "t" : "f"}_${
              score.difficulty
            }`
          ] ?? "",
          newSongTitles.has(score.title) ? "Y": ""
        ]),
    ];
  }
  const output = unparse({
    fields: [
      "level",
      "category",
      "title",
      "deluxe",
      "difficulty",
      "internal_lv",
      "new"
    ],
    data: result,
  });
  await fsPromises.writeFile("dxnet.csv", output);
};
go();
