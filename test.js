var assert = require('assert')
var DirectoryCache = require('./index.js')
var rimraf = require('rimraf')
var path = require('path')
var async = require('async')
var _ = require('lodash')
var fs = require('fs')
var TEST_DIR = path.join(__dirname, 'testdir')
var testNumber = 0
var currentTestDir

describe('DirectoryCache', function () {
	var cache

	beforeEach(function (done) {
		testNumber++

		currentTestDir = TEST_DIR + testNumber.toString()

		var work = []

		if (cache)
			cache.stop()

		if (fs.existsSync(currentTestDir)) {
			work.push(_.bind(rimraf, null, currentTestDir))			
		}

		work.push(_.bind(fs.mkdir, fs, currentTestDir))		
		work.push(_.bind(fs.writeFile, fs, path.join(currentTestDir, '1.json'), JSON.stringify({ a: 1 })))		
		work.push(_.bind(DirectoryCache.create, null, currentTestDir))

		async.waterfall(work, function(err, _cache) {

			if (err) return done(err)

			cache = _cache

			setTimeout(done, 1000)
		})
	})

	afterEach(function (done) {
		rimraf(currentTestDir, done)
	})

	it('loads the content of the files in the target directory when created', function () {		
		assert.deepEqual(cache.cache['1.json'], { a: 1 })
		assert.strictEqual(cache.count, 1)
	})

	describe('updates the cache when', function () {
		it('files are added', function (done) {

			assert.strictEqual(cache.count, 1)
			
			cache.on('add', function (file, data) {	
				assert.strictEqual(cache.count, 2)
				assert.deepEqual(data, { b: 1 })
				assert.deepEqual(cache.cache['2.json'], { b: 1})
				done()
			})

			writeFile('2.json', JSON.stringify({ b: 1 }), function(err) {})			
		})

		it('files are changed', function (done) {
			
			assert.strictEqual(cache.count, 1)
			
			cache.on('add', function (file, data) {
				
				cache.on('update', function(file, data) {
					assert.strictEqual(file, 'x')		
					assert.strictEqual(data.toString(), 'xy')
					done()
				})

				appendFile('x', 'y', function() {})
			})

			writeFile('x', 'x', function(err) {})
		})

		it('files are deleted', function(done) {
			assert.strictEqual(cache.count, 1)
			
			cache.on('delete', function (file, data) {
				assert.strictEqual(file, '1.json')
				assert.deepEqual(data, { a: 1 })
				done()
			})

			deleteFile('1.json')
		})
	})
})

function writeFile(name, content, callback) {
	fs.writeFile(path.join(currentTestDir, name), content, callback)
}

function writeFileSync(name, content) {
	fs.writeFileSync(path.join(currentTestDir, name), content)
}

function deleteFile(name) {
	fs.unlink(path.join(currentTestDir, name))
}

function appendFile(name, content, callback) {
	fs.appendFile(path.join(currentTestDir, name), content, callback)
}