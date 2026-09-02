const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collectUniqueSuggestions,
  detectTitleSurfaceFrame,
  hasEnoughStructuralVariety,
  isNearDuplicateTitle,
} = require("../dist/services/title/titleGeneration.shared.js");
const { titleGenerationPrompt } = require("../dist/prompting/prompts/helper/titleGeneration.prompt.js");

test("collectUniqueSuggestions maps legacy title fields into the current schema", () => {
  const titles = collectUniqueSuggestions([{
    title: "ქალაქი, რომელმაც ჩემი სახელი დაივიწყა",
    score: 88,
    hookType: "identity_gap",
    coreSell: "დაკარგული იდენტობა",
    reason: "სათაური აერთიანებს ადგილს, საიდუმლოს და პირად დანაკარგს",
  }], 1);

  assert.equal(titles.length, 1);
  assert.equal(titles[0].clickRate, 88);
  assert.equal(titles[0].style, "conflict");
  assert.equal(titles[0].angle, "დაკარგული იდენტობა");
  assert.equal(titles[0].reason, "სათაური აერთიანებს ადგილს საიდუმლოს და პირად დანაკარგს");
});

test("detectTitleSurfaceFrame distinguishes Georgian title structures", () => {
  assert.equal(detectTitleSurfaceFrame("დაკარგული კარი: დაბრუნების ფასი"), "colon_split");
  assert.equal(detectTitleSurfaceFrame("ქალაქი, რომელმაც ჩემი სახელი დაივიწყა"), "comma_split");
  assert.equal(detectTitleSurfaceFrame("ვინ მოკლა დრო?"), "question");
  assert.equal(detectTitleSurfaceFrame("თუ მთვარე აღარ ამოვა"), "conditional_open");
  assert.equal(detectTitleSurfaceFrame("მე ვიპოვე დავიწყებული ქალაქი"), "first_person_open");
  assert.equal(detectTitleSurfaceFrame("ჩემი უკანასკნელი ზაფხული"), "possessive_open");
  assert.equal(detectTitleSurfaceFrame("შავი ზღვის მეზღვაური"), "plain_phrase");
});

test("collectUniqueSuggestions accepts one-word Georgian titles and rejects limits", () => {
  const elevenWords = "ერთი ორი სამი ოთხი ხუთი ექვსი შვიდი რვა ცხრა ათი თერთმეტი";
  const longCodePoints = "ა".repeat(81);
  const titles = collectUniqueSuggestions([
    { title: "მზე", clickRate: 90, style: "literary" },
    { title: elevenWords, clickRate: 89, style: "conflict" },
    { title: longCodePoints, clickRate: 88, style: "suspense" },
  ], 3, [], { enforceFrameDiversity: false });

  assert.deepEqual(titles.map((item) => item.title), ["მზე"]);
});

test("near-duplicate detection uses Georgian word tokens and trigram fallback", () => {
  assert.equal(isNearDuplicateTitle("დაკარგული ქალაქი", "დაკარგული ქალაქი!"), true);
  assert.equal(isNearDuplicateTitle("დაკარგული ქალაქი", "დაკარგული ქალაქის კარი"), true);
  assert.equal(isNearDuplicateTitle("დაკარგული ქალაქი", "შავი ზღვის მეზღვაური"), false);
});

test("collectUniqueSuggestions limits overused title structures within a batch", () => {
  const rawTitles = [
    { title: "ქალაქი, რომელმაც დილა დაკარგა", clickRate: 90, style: "high_concept" },
    { title: "სახლი, რომელიც ზღვას ელოდა", clickRate: 89, style: "literary" },
    { title: "კაცი, რომელმაც ქარი გაყიდა", clickRate: 88, style: "conflict" },
    { title: "გოგო, რომელმაც ტყე გააღვიძა", clickRate: 87, style: "suspense" },
    { title: "დაკარგული კარი: დაბრუნების ფასი", clickRate: 86, style: "high_concept" },
    { title: "თუ მთვარე აღარ ამოვა", clickRate: 85, style: "suspense" },
    { title: "ვინ მოკლა დრო?", clickRate: 84, style: "suspense" },
    { title: "ჩემი უკანასკნელი ზაფხული", clickRate: 83, style: "literary" },
  ];

  const titles = collectUniqueSuggestions(rawTitles, 6);
  const commaCount = titles.filter((item) => detectTitleSurfaceFrame(item.title) === "comma_split").length;
  assert.equal(titles.length, 6);
  assert.ok(commaCount <= 3);
});

test("primary title selection preserves the model decision", () => {
  const titles = collectUniqueSuggestions([
    { title: "როცა ქალაქმა ჩემი სახელი დაივიწყა", clickRate: 76, style: "conflict" },
    { title: "უსახელო", clickRate: 96, style: "literary" },
    { title: "ჩემი დაკარგული ქუჩა", clickRate: 88, style: "suspense" },
    { title: "დაბრუნების ფასი", clickRate: 84, style: "conflict" },
  ], 4, [], { preserveOrder: true, enforceFrameDiversity: false });

  assert.equal(titles.length, 4);
  assert.equal(titles[0].title, "როცა ქალაქმა ჩემი სახელი დაივიწყა");
});

test("hasEnoughStructuralVariety rejects batches that reuse one frame too heavily", () => {
  const narrowBatch = Array.from({ length: 8 }, (_, index) => ({
    title: `ქალაქი, რომელმაც საიდუმლო დაკარგა ${index + 1}`,
    clickRate: 88 - index,
    style: "high_concept",
  }));
  assert.equal(hasEnoughStructuralVariety(narrowBatch, 8), false);
});

test("title prompt requests Georgian output, current fields, and structure diversity", () => {
  const messages = titleGenerationPrompt.render({
    context: {
      mode: "brief",
      selectionMode: "pool",
      count: 8,
      brief: "შავიზღვისპირა ქალაქში ახალგაზრდა მეზღვაური დაკარგულ სახელებს ეძებს.",
      referenceTitle: "",
      novelTitle: "",
      currentTitle: "",
      genreName: "Mystery",
      genreDescription: "Memory, identity, and a coastal community.",
    },
    forceJson: true,
    retryReason: "Too many titles use the same structure",
  }, { blocks: [], selectedBlockIds: [], droppedBlockIds: [], summarizedBlockIds: [], estimatedInputTokens: 0 });

  const systemPrompt = String(messages[0].content);
  assert.match(systemPrompt, /Georgian-language fiction title editor/);
  assert.match(systemPrompt, /1-10 words/);
  assert.match(systemPrompt, /80 Unicode code points/);
  assert.match(systemPrompt, /clickRate.*internal AI appeal estimate/);
  assert.match(systemPrompt, /Too many titles use the same structure/);
  assert.doesNotMatch(systemPrompt, /Chinese|Qidian|Fanqie|Jinjiang|Zhihu/i);
});

test("primary title prompt makes the first result the main recommendation", () => {
  const messages = titleGenerationPrompt.render({
    context: {
      mode: "brief",
      selectionMode: "primary",
      count: 4,
      brief: "ქალაქი თანდათან ივიწყებს ყველა მკვიდრის სახელს.",
      referenceTitle: "",
      novelTitle: "",
      currentTitle: "",
      genreName: "Speculative mystery",
      genreDescription: "A relationship story under supernatural pressure.",
    },
    forceJson: true,
    retryReason: null,
  }, { blocks: [], selectedBlockIds: [], droppedBlockIds: [], summarizedBlockIds: [], estimatedInputTokens: 0 });

  const systemPrompt = String(messages[0].content);
  const humanPrompt = String(messages[1].content);
  assert.match(systemPrompt, /main title.*titles\[0\]/);
  assert.match(systemPrompt, /single recommendation/);
  assert.match(humanPrompt, /choose one main title in titles\[0\]/);
});
