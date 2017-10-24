var ffmpeg = require('fluent-ffmpeg')
var ffmpegBin = require('ffmpeg-binaries')

ffmpeg.setFfmpegPath(ffmpegBin.ffmpegPath)
ffmpeg.setFfprobePath(ffmpegBin.ffprobePath)
