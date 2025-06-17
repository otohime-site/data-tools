import { promises as fsPromises } from "fs";
import papaparse from "papaparse";
const { parse } = papaparse;

const diffs = ["bsc", "adv", "exp", "mas", "rem"];

interface CSVResult {
  level: string;
  category: string;
  title: string;
  deluxe: string;
  difficulty: string;
  internal_lv: string;
  new: string;
}

const processTitle = (title: string) => (title.length == 0 ? "　" : title);

const go = async () => {
  const content = await fsPromises.readFile("prepared.csv", {
    encoding: "utf-8",
  });
  const rawResult = parse<CSVResult>(content, { header: true });

  const noRatingCount = rawResult.data.filter((row) => !row.internal_lv).length;
  console.log(`${noRatingCount} notes has no internal Lvs`);
  rawResult.data.map((row) => {
    if (!row.internal_lv) {
      return;
    }
    if (
      row.level == "12+" &&
      !["12.6", "12.7", "12.8", "12.9"].includes(row.internal_lv)
    ) {
      console.log(
        `Internal Lv not match for ${row.title}!! ${row.level} vs ${row.internal_lv}`
      );
      row.internal_lv = ""
    }
    if (
      row.level == "13" &&
      !["13", "13.0", "13.1", "13.2", "13.3", "13.4", "13.5"].includes(
        row.internal_lv
      )
    ) {
      console.log(
        `Internal Lv not match for ${row.title}!! ${row.level} vs ${row.internal_lv}`
      );
      row.internal_lv = ""
    }
    if (
      row.level == "13+" &&
      !["13.6", "13.7", "13.8", "13.9"].includes(row.internal_lv)
    ) {
      console.log(
        `Internal Lv not match for ${row.title}!! ${row.level} vs ${row.internal_lv}`
      );
      row.internal_lv = ""
    }
    if (
      row.level == "14" &&
      !["14", "14.0", "14.1", "14.2", "14.3", "14.4", "14.5"].includes(
        row.internal_lv
      )
    ) {
      console.log(
        `Internal Lv not match for ${row.title}!! ${row.level} vs ${row.internal_lv}`
      );
      row.internal_lv = ""
    }   
    if (
      row.level == "14+" &&
      !["14.6", "14.7", "14.8", "14.9"].includes(row.internal_lv)
    ) {
      console.log(
        `Internal Lv not match for ${row.title}!! ${row.level} vs ${row.internal_lv}`
      );
      row.internal_lv = ""
    }     
  });

  const result = rawResult.data
    .filter((row) => !!row.internal_lv)
    .reduce(
      (prev, row) => ({
        ...prev,
        [`${row.category}_${processTitle(row.title)}_${
          row.deluxe == "dx" ? "t" : "f"
        }_${diffs.indexOf(row.difficulty)}`]: parseFloat(row.internal_lv),
      }),
      {}
    );
  await fsPromises.writeFile(
    "internal_lv_prism.json",
    JSON.stringify(result, undefined, 2)
  );
};
go();
