import fs from 'fs'
import path from 'path'
import glob from 'glob'
import shell from 'shelljs'
import ffmpeg from 'fluent-ffmpeg'

import {cleanFileName, extractFileNameParts, getFilesizeInBytes, rangePattern} from '../../../utils/file/index'

const SpeechService = require('ms-bing-speech-service')

let progressHandler = function (commit) {
  return (progress) => {
    commit('SET_PRE_PROCESSING_PROGRESS', progress.percent)
  }
}

const options = {
  language: 'de-DE',
  subscriptionKey: process.env.AZURE_SUBSCRIPTION_KEY
}

const recognizer = new SpeechService(options)

const state = {
  videoPath: undefined,
  stage: undefined,
  preProcessingProgress: 0,
  intervalSize: 0
}

const mutations = {
  SET_VIDEO (state, videoPath) {
    console.log('set state')
    state.videoPath = videoPath
  },
  SET_PRE_PROCESSING_PROGRESS (state, progress) {
    state.preProcessingProgress = progress
    if (progress === 100) {
      state.stage = ''
    }
  },
  SET_PROCESSING_STAGE (state, stage) {
    state.stage = stage
  },
  SET_INTERVAL_SIZE (state, seconds) {
    state.intervalSize = seconds
  },
  SET_RECOGNIZER (state, recognizer) {
    state.recognizer = recognizer
  }
}

const actions = {
  someAsyncTask ({ commit }) {
    // do something async
    commit('INCREMENT_MAIN_COUNTER')
  },
  async processVideo (context, {videoPath, outputFormat = 'wav', audioFrequency = 16000, codec = 'pcm_s16le'}) {
    let dirName = path.dirname(videoPath)
    let fileNameParts = extractFileNameParts(videoPath)

    let fileName = cleanFileName(fileNameParts[0])
    let outputFileName = `${fileName}_${audioFrequency}_${codec}`

    // Create directory if it does not exist
    let wavDir = `${dirName}/${outputFormat}`
    shell.mkdir('-p', wavDir)

    let outputFile = `${wavDir}/${outputFileName}.${outputFormat}`

    context.commit('SET_PROCESSING_STAGE', 'Extracting Audio')

    try {
      fs.openSync(outputFile, 'r')
      context.commit('SET_PRE_PROCESSING_PROGRESS', 100)
    } catch (e) {
      ffmpeg(videoPath).audioCodec('pcm_s16le').audioFrequency(audioFrequency).outputFormat(outputFormat
      ).audioChannels(1).output(outputFile).on('end', function () {
        context.commit('SET_PRE_PROCESSING_PROGRESS', 100)
      }).on('progress', progressHandler).run()
    }

    let size = getFilesizeInBytes(outputFile)
    let splitFilesCount = Math.ceil(size / (16000 * 2 * 600 + 44))

    let fileData

    const getOutputFilename = function () {
      return `${wavDir}/${outputFileName}*@(${rangePattern(splitFilesCount).join('|')}).${outputFormat}`
    }

    const startRecognition = function () {
      context.commit('SET_PROCESSING_STAGE', '')
      var filesPattern = getOutputFilename()
      console.log(`filesPattern ${filesPattern}`)

      let fileIndex = 0
      let intervalSize = context.state.intervalSize

      glob(filesPattern, {}, function (er, files) {
        recognizer.start((error, service) => {
          // let intervalSize = state.intervalSize
          // var counter = 0
          if (!error) {
            service.on('recognition', (e) => {
              if (e.RecognitionStatus === 'Success') {
                console.log(`${(fileIndex + 1) * intervalSize}` + JSON.stringify(e))
                fs.appendFileSync(`message${fileIndex}.txt`, 'WEBVTT FILE\n')
                // if (counter > 10) {
                //   console.log(`Counter ${counter}`)
                //   recognizer.stop((error) => {
                //     if (!error) console.log('recognizer service stopped.')
                //   })
                // } else {
                //   counter++
                // }
              }
            })

            service.on('error', (error) => {
              console.log(error)
            })

            var nextFile = files[fileIndex]

            const sendNextFile = function (file) {
              service.sendFile(nextFile, function () {
                console.log('processed ' + files[fileIndex])
                if (fileIndex < splitFilesCount - 1) {
                  fileIndex++
                  console.log('send next file ' + fileIndex)
                  fs.appendFileSync(`message${fileIndex}.txt`, 'WEBVTT FILE\n')
                  sendNextFile(files[fileIndex])
                }
              })
            }

            sendNextFile(nextFile)
          }
        })
      })
    }

    ffmpeg(videoPath).ffprobe(function (err, data) {
      fileData = data
      let maxSplitInterval = Math.round(fileData.format.duration / splitFilesCount)
      context.commit('SET_INTERVAL_SIZE', maxSplitInterval)

      var l = `${wavDir}/${outputFileName}*+([0-9]).${outputFormat}`

      glob(l, {}, function (er, files) {
        if (files.length < splitFilesCount) {
          context.commit('SET_PROCESSING_STAGE', 'Splitting Audio')
          ffmpeg(outputFile).outputOptions([
            '-f segment',
            `-segment_time ${maxSplitInterval}`,
            '-c copy'
          ]).output(`${wavDir}/${outputFileName}%03d.${outputFormat}`
          ).on('progress', progressHandler(context.commit)
          ).on('end', function (stdout, stderr) {
            startRecognition()
          }).run()
        } else {
          startRecognition()
        }
      })
      if (err) {
        console.err(err)
      }
    })
  }
}

export default {
  state,
  mutations,
  actions
}
