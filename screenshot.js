const fs = require('fs'),
    expect = require('chai').expect,
    PNG = require('pngjs').PNG,
    pixelmatch = require('pixelmatch');

// Named function parameters in JS - YAY!
async function takeAndCompareScreenshot({
    page,
    baseUrl,
    route,
    filePrefix,
    testDir,
    goldenDir
}) {
    // Start the browser, go to that page, and take a screenshot.
    await page.goto(`${baseUrl}/${route}`);
    // Get the "viewport" of the page, as reported by the page.
    await page.screenshot({
        path: `${testDir}/${route}/${filePrefix}.png`
    });

    // Test to see if it's right.
    return compareScreenshots(testDir, route, filePrefix, goldenDir);
}

function compareScreenshots(testDir, route, filePrefix, goldenDir) {
    return new Promise((resolve, reject) => {
        const img1 = fs.createReadStream(`${testDir}/${route}/${filePrefix}.png`).pipe(new PNG()).on('parsed', doneReading);
        const img2 = fs.createReadStream(`${goldenDir}/${route}/${filePrefix}.png`).pipe(new PNG()).on('parsed', doneReading);

        let filesRead = 0;

        function doneReading() {
            // Wait until both files are read.
            if (++filesRead < 2) return;

            // The files should be the same size.
            expect(img1.width, 'image widths are the same').equal(img2.width);
            expect(img1.height, 'image heights are the same').equal(img2.height);

            // Do the visual diff.
            const diff = new PNG({
                width: img1.width,
                height: img2.height
            });
            const numDiffPixels = pixelmatch(
                img1.data, img2.data, diff.data, img1.width, img1.height, {
                    threshold: 0.5
                });

            // Save the visual diff file if changed more than the limit
            const pixelLimit = 50000;
            if (numDiffPixels >= pixelLimit) {
                diff.pack().pipe(fs.createWriteStream(`${testDir}/${route}/${filePrefix}.diff.png`));
            }

            // The files should look about the same
            // Threshold and pixel amount are just random numbers right now
            expect(numDiffPixels, 'number of different pixels').lessThan(pixelLimit);
            resolve();
        }
    });
}

module.exports = {
    takeAndCompareScreenshot
};