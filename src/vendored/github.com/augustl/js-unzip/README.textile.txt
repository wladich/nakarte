h2. JSUnzip

A javascript library for reading the contents of zip files.

NOTE: Does not uncompress/inflate files. Zip is a package format that can use many different compression methods. See "Working with <code>JSUnzip.ZipEntry</code>" below.

<pre><code>var myZip = ... // Get it with an XHR request, HTML5 files, etc.
var unzipper = new JSUnzip(myZip);
unzipper.isZipFile();      // true or false

unzipper.readEntries();    // Creates "entries"
unzipper.entries;          // Array of JSUnzip.ZipEntry objects.
</code></pre>

The test suite runs on Chrome 4, FireFox 3.6, IE7, Opera 10 and Safari 4.0.4. [TODO: Run tests on more browsers.]

h2. Download

"http://github.com/downloads/augustl/js-unzip/js-unzip.min.js":http://github.com/downloads/augustl/js-unzip/js-unzip.min.js

h2. Working with <code>JSUnzip.ZipEntry</code> objects

After <code>readEntries</code> is called, an array of <code>JSUnzip.ZipEntry</code> objects is created, one per file in the Zip archive.

<pre><code>entry = myZip.entries[0];

// Attributes
entry.fileName;          // The file name of the entry. Contains the full path.
                         // Examples:
                         //   "foo.txt"
                         //   "directory/bar.jpg"
entry.data;              // The raw compressed data
entry.compressionMethod; // Number representing compression method.
                         //   1: No compression. File can be used as-is.
                         //   8: DEFLATE. The most common compression method.
                         //      Use a inflate algorithm to uncompress, such
                         //      as http://github.com/augustl/js-inflate/
entry.compressedSize;    // The size of the commpressed data
entry.uncompressedSize;  // The size of the data when it's uncompressed
entry.signature;         // The magic number used to determine if it is in fact
                         // a zip file.
entry.versionNeeded;     // Zip specification version needed to work with the file.
entry.bitFlag;           // Flag for various states

// Functions (mostly for internal use)
entry.isEncrypted();
entry.isUsingUtf8();
entry.isUzingZip64();    // Zip64 is for 4gb+ files. Not supported by this lib.
</code></pre>

See "http://www.pkware.com/documents/casestudies/APPNOTE.TXT":http://www.pkware.com/documents/casestudies/APPNOTE.TXT for more information about the Zip format, such as all the  compression methods.

h2. Uncompressing with JSInflate

Almost all Zip files are compressed with the deflate algorithm. You can use "JSInflate":http://github.com/augustl/js-inflate to uncompress these Zips.

<pre><code>var blob = ...; // A HTML5 binary file, for example.
var unzipper = new JSUnzip(blob);
if (unzipper.isZipFile()) {

  unzipper.readEntries();

  for (var i = 0; i < unzipper.entries.length; i++) {
    var entry = unzipper.entries[i];
    if (entry.compressionMethod === 0) {
      // Uncompressed
      var uncompressed = entry.data; 
    } else if (entry.compressionMethod === 8) {
      // Deflated
      var uncompressed = JSInflate.inflate(entry.data);
    }
  }
}</code></pre>

h2. Credits

* Jacob Seidelin for his "JavaScript EXIF Reader":http://blog.nihilogic.dk/2008/05/reading-exif-data-with-javascript.html.
* Jonas Höglund for his cute little "zip parser":http://etc.firefly.nu/js/zip/zipParser.js. 
* "Cheeso" for his "js zip library":http://cheeso.members.winisp.net/srcview.aspx?dir=js-unzip&file=js-zip.zip.

h2. About

Written by August Lilleaas <august.lilleaas@gmail.com>. Licensed under the MIT license.
