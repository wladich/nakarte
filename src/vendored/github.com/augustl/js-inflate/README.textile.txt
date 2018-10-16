h2. JSInflate

A JavaScript library for inflating deflated binary blobs. Can be used to uncompress Zip files, for example.

<pre><code>var result = JSInflate.inflate(compressedBlob);</code></pre>

That's all there is to it!

The test suite runs on Chrome 4, FireFox 3.6, IE7, Opera 10 and Safari 4.0.4. [TODO: Run tests on more browsers.]

h2. Alternatives

You might want to check out "https://github.com/dankogai/js-deflate":https://github.com/dankogai/js-deflate too. It has inflate as well as deflate.

h2. node.js, commonjs, etc.

See JSInflate.inflateStream. Incomplete, feel free to give this API some love and submit the code to me.

h2. Download

"http://github.com/downloads/augustl/js-inflate/js-inflate.min.js":http://github.com/downloads/augustl/js-inflate/js-inflate.min.js

h2. Extracting Zip files

If you want to extract Zip files, you can use this library along with "JSUnzip":http://github.com/augustl/js-unzip.

h2. Acknowledgements

Almost all the code is a copy-paste of a "script":http://www.onicos.com/staff/iz/amuse/javascript/expert/inflate.txt written by Masanao Izumo. This libary is merely a wrapper that doesn't pollute the global namespace and provides a constructor instead of a global function. Everything else was written by M. Izumo.

h2. About

(Barely) written by August Lilleaas <august.lilleaas@gmail.com>