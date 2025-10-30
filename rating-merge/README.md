### Rating Merge Tools

This is a tool to prepare the updated internal level JSON file using the resources previously available.

This tool may be reworked soon, see the TODO section.

#### Usage

* `auto-fill.ts`: Generates internal level JSON for international version of maimai using the Japanese version of DXNET.

Only DXNET files from PRiSM PLUS (or maybe later), where the song record in level will sort with internal level then category, is supported.

Data from Japanese version is be used as it is 4 months ahead of international one. You must sign in with Japanese DXNET (which means you must have played maimai in Japan at least once in any time), then
prepare the following HTML files from DXNET:
* `circle.htm`: Song record from the latest version
* `mas.htm`: Song record for all genre with master difficulty
* `10.htm`, `10_plus.htm`, ... `15.htm`: Song record from Level 10 to Level 15

To filter out unavailable songs in international version, `assets/internal_lvs/versions.json` will be used, songs from previous version will be included only if it is mentioned in this JSON file. Another `assets/internal_lvs/manual.json` will contain songs not available in the following HTML, notably songs unlocked through class rank or special game mode which are hidden in DXNET after PRiSM update. It also adds international version only song, "全世界共通リズム感テスト".