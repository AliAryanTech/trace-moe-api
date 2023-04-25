import TraceMoeAPI, { baseURL } from "../src/TraceMoeAPI";
import { Endpoint, APIError, MediaSize } from "../src/types/types";

import {
	buildRawSearchResponseMock,
	buildSearchResponseMock,
	buildRawAPILimitsResponseMock,
	buildAPILimitsResponseMock
} from "./utils/response-mock-builders";

import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import fs from "fs";
import mockFS from "mock-fs";
import path from "path";

const axiosMockAdapter = new AxiosMockAdapter(axios);

describe("TraceMoeAPI", () => {
	const searchEndpoint = baseURL + Endpoint.search;
	const meEndpoint = baseURL + Endpoint.me;

	let traceMoeAPI: TraceMoeAPI;

	beforeAll(() => {
		traceMoeAPI = new TraceMoeAPI();
	});

	afterEach(() => {
		axiosMockAdapter.reset();
	});

	describe("Fetch anime with media URL", () => {
		const mediaURL = "https://images.plurk.com/32B15UXxymfSMwKGTObY5e.jpg";

		let searchGetMatcher: RegExp;

		beforeAll(() => {
			searchGetMatcher = new RegExp(`${searchEndpoint}\\?.+`);
		});

		test("Pass media URL in query parameters", async () => {
			axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock());
			await traceMoeAPI.searchForAnimeSceneWithMediaURL(mediaURL);

			expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain(`url=${mediaURL}`);
		});

		test("Filter by AniList ID", async () => {
			const rawSearchResponseMock = buildRawSearchResponseMock();
			const anilistID = rawSearchResponseMock.result![0].anilist as number;

			axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, rawSearchResponseMock);
			await traceMoeAPI.searchForAnimeSceneWithMediaURL(mediaURL, { anilistID });

			expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain(`anilistID=${anilistID}`);
		});

		test("Cut black borders", async () => {
			axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock());
			await traceMoeAPI.searchForAnimeSceneWithMediaURL(mediaURL, { shouldCutBlackBorders: true });

			expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain("cutBorders");
		});

		test("Don't include extra AniList info", async () => {
			const searchResponseMock = buildSearchResponseMock();

			axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock());
			const response = await traceMoeAPI.searchForAnimeSceneWithMediaURL(mediaURL);

			expect(response).toEqual(searchResponseMock);
		});

		test("Include extra AniList info", async () => {
			const searchResponseMock = buildSearchResponseMock(true);

			axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock(true));

			const response = await traceMoeAPI.searchForAnimeSceneWithMediaURL(
				mediaURL,
				{ shouldIncludeExtraAnilistInfo: true }
			);

			expect(response).toEqual(searchResponseMock);
		});

		test("Pass API key in header", async () => {
			traceMoeAPI.apiKey = "xxxxxxxxxxxxxxxxxxxxxxx";

			axiosMockAdapter.onGet(searchGetMatcher).replyOnce(200, buildRawSearchResponseMock());
			const response = await traceMoeAPI.searchForAnimeSceneWithMediaURL(mediaURL);

			const headers = axiosMockAdapter.history.get[0].headers;
			expect(headers).toMatchObject({ "x-trace-key": traceMoeAPI.apiKey });

			traceMoeAPI.apiKey = undefined;
		});

		test("API error", async () => {
			const errorMessage = "Concurrency limit exceeded";
			const expectedError = new APIError(errorMessage, 402);

			expect.assertions(1);

			try {
				axiosMockAdapter.onGet(searchGetMatcher).replyOnce(402, { error: errorMessage });
				const response = await traceMoeAPI.searchForAnimeSceneWithMediaURL(mediaURL);
			} catch (error) {
				expect(error).toEqual(expectedError);
			}
		});
	});

	describe("Fetch anime with media path", () => {
		const mediaPath = "test.jpg";

		let searchPostMatcher: RegExp;

		beforeAll(() => {
			searchPostMatcher = new RegExp(`${searchEndpoint}(?:\\?.+)?`);
			mockFS({ [mediaPath]: Buffer.from([8, 6, 7, 5, 3, 0, 9]) });
		});

		afterAll(() => {
			mockFS.restore();
		});

		test("Pass image data in body", async () => {
			axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
			await traceMoeAPI.searchForAnimeSceneWithMediaAtPath(mediaPath);

			expect(axiosMockAdapter.history.post[0].data).toEqual(fs.readFileSync(mediaPath));
		});

		test("Filter by AniList ID", async () => {
			const rawSearchResponseMock = buildRawSearchResponseMock();
			const anilistID = rawSearchResponseMock.result![0].anilist as number;

			axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, rawSearchResponseMock);
			await traceMoeAPI.searchForAnimeSceneWithMediaAtPath(mediaPath, { anilistID });

			expect((new URL(axiosMockAdapter.history.post[0].url!).search)).toContain(`anilistID=${anilistID}`);
		});

		test("Cut black borders", async () => {
			axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
			await traceMoeAPI.searchForAnimeSceneWithMediaAtPath(mediaPath, { shouldCutBlackBorders: true });

			expect((new URL(axiosMockAdapter.history.post[0].url!).search)).toContain("cutBorders");
		});

		test("Don't include extra AniList info", async () => {
			const searchResponseMock = buildSearchResponseMock();

			axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
			const response = await traceMoeAPI.searchForAnimeSceneWithMediaAtPath(mediaPath)

			expect(response).toEqual(searchResponseMock);
		});

		test("Include extra AniList info", async () => {
			const searchResponseMock = buildSearchResponseMock(true);

			axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock(true));

			const response = await traceMoeAPI.searchForAnimeSceneWithMediaAtPath(
				mediaPath,
				{ shouldIncludeExtraAnilistInfo: true }
			);

			expect(response).toEqual(searchResponseMock);
		});

		test("Pass correct content type", async () => {
			axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
			await traceMoeAPI.searchForAnimeSceneWithMediaAtPath(mediaPath);

			const headers = axiosMockAdapter.history.post[0].headers;
			expect(headers).toMatchObject({ "Content-Type": "application/x-www-form-urlencoded" });
		});

		test("Pass API key in header", async () => {
			traceMoeAPI.apiKey = "xxxxxxxxxxxxxxxxxxxxxxx";

			axiosMockAdapter.onPost(searchPostMatcher).replyOnce(200, buildRawSearchResponseMock());
			await traceMoeAPI.searchForAnimeSceneWithMediaAtPath(mediaPath);

			const headers = axiosMockAdapter.history.post[0].headers;
			expect(headers).toMatchObject({ "x-trace-key": traceMoeAPI.apiKey });

			traceMoeAPI.apiKey = undefined;
		});

		test("API error", async () => {
			const errorMessage = "Concurrency limit exceeded";
			const expectedError = new APIError(errorMessage, 402);

			expect.assertions(1);

			try {
				axiosMockAdapter.onPost(searchPostMatcher).replyOnce(402, { error: errorMessage });
				const response = await traceMoeAPI.searchForAnimeSceneWithMediaAtPath(mediaPath);
			} catch (error) {
				expect(error).toEqual(expectedError);
			}
		});
	});

	describe("Fetch API limits", () => {
		test("Without API key", async () => {
			const apiLimitsResponseMock = buildAPILimitsResponseMock();

			axiosMockAdapter.onGet(meEndpoint).replyOnce(200, buildRawAPILimitsResponseMock());
			const response = await traceMoeAPI.fetchAPILimits();

			expect(response).toEqual(apiLimitsResponseMock);
		});

		test("With API key", async () => {
			traceMoeAPI.apiKey = "xxxxxxxxxxxxxxxxxxxxxxx";

			const apiLimitsResponseMock = buildAPILimitsResponseMock(traceMoeAPI.apiKey);

			axiosMockAdapter.onGet(meEndpoint).replyOnce(200, buildRawAPILimitsResponseMock(traceMoeAPI.apiKey));
			const response = await traceMoeAPI.fetchAPILimits();

			expect(response).toEqual(apiLimitsResponseMock);
		});
	});

	describe("Download media previews", () => {
		const mediaBaseURL = "https://media.trace.moe";

		const destinationDirectory = path.join(__dirname, "media");
		const destinationName = "test";

		let imageGetMatcher: RegExp;
		let videoGetMatcher: RegExp;

		beforeAll(() => {
			imageGetMatcher = new RegExp(`${mediaBaseURL}/image/.+`);
			videoGetMatcher = new RegExp(`${mediaBaseURL}/video/.+`);

			mockFS({ [destinationDirectory]: {} });
		});

		afterAll(() => {
			mockFS.restore();
		});
		
		describe("Videos", () => {
			test("Download", async () => {
				const videoBuffer = Buffer.from([8, 6, 7, 5, 3, 0, 9]);
				const resultMock = buildSearchResponseMock().results[0];
				const mediaSize = MediaSize.medium;
				const destinationPath = path.join(destinationDirectory, destinationName + ".mp4");
	
				axiosMockAdapter.onGet(videoGetMatcher).replyOnce(200, videoBuffer);
	
				const response = await traceMoeAPI.downloadVideoFromResult(
					resultMock,
					{ size: mediaSize, shouldMute: false, directory: destinationDirectory, name: destinationName }
				);
	
				expect(response).toBe(destinationPath);
				expect(fs.existsSync(destinationPath)).toBeTruthy();
				expect(fs.readFileSync(destinationPath)).toEqual(videoBuffer);
				expect(axiosMockAdapter.history.get[0].url).toEqual(`${resultMock.videoURL}&size=${mediaSize}`);
			});
	
			test("Request muted", async () => {
				const resultMock = buildSearchResponseMock().results[0];
	
				axiosMockAdapter.onGet(videoGetMatcher).replyOnce(200, Buffer.from([8, 6, 7, 5, 3, 0, 9]));
				const response = await traceMoeAPI.downloadVideoFromResult(resultMock, { shouldMute: true });
	
				expect((new URL(axiosMockAdapter.history.get[0].url!).search)).toContain("mute");
			});
		});

		describe("Images", () => {
			test("Download", async () => {
				const imageBuffer = Buffer.from([8, 6, 7, 5, 3, 0, 9]);
				const resultMock = buildSearchResponseMock().results[0];
				const mediaSize = MediaSize.medium;
				const destinationPath = path.join(destinationDirectory, destinationName + ".jpg");
	
				axiosMockAdapter.onGet(imageGetMatcher).replyOnce(200, imageBuffer);
	
				const response = await traceMoeAPI.downloadImageFromResult(
					resultMock,
					{ size: mediaSize, directory: destinationDirectory, name: destinationName },
				);
	
				expect(response).toBe(destinationPath);
				expect(fs.existsSync(destinationPath)).toBeTruthy();
				expect(fs.readFileSync(destinationPath)).toEqual(imageBuffer);
				expect(axiosMockAdapter.history.get[0].url).toEqual(`${resultMock.imageURL}&size=${mediaSize}`);
			});
		});
	});
});
