<template>
  <div>
    <video id="video" ref="video" width="320" height="240" :src="videoPath" autoplay controls>
      <track label="Deutsch" kind="subtitles" srclang="de" src="captions/vtt/sintel-de.vtt">
    </video>
    <button @click="onLoadVideo">Load Video</button>
    <video-status-bar></video-status-bar>
  </div>
</template>

<script>
  import path from 'path'
  import VideoStatusBar from './VideoPlayer/StatusBar'

  const {BrowserWindow} = require('electron')

  export default {
    components: {VideoStatusBar},
    name: 'VideoPlayer',
    data () {
      return {
        win: undefined
      }
    },
    methods: {
      onLoadVideo () {
        var remote = require('electron').remote
        var dialog = remote.dialog
        var videoPath = dialog.showOpenDialog(this.win, {
          title: 'Load Video',
          defaultPath: '/Users/tillkolter/work/me/speech/data/',
          filters: [
            { name: 'Movies', extensions: ['mkv', 'avi', 'mp4'] }
          ]
        })
        let remotePath = path.join('file://' + videoPath[0])
        this.$store.commit('SET_VIDEO', remotePath)
        this.$store.dispatch('processVideo', {videoPath: videoPath[0]})
      },
      playVideo () {
        var video = this.$refs.video
        video.addEventListener('loadedmetadata', function () {
          this.width = video.videoWidth
          this.height = video.videoHeight
          this.ratio = this.width / this.height
          this.duration = video.duration
          this.$emit('metadata')
        }, false)
      }
    },
    computed: {
      videoPath () {
      //        return ''
        return this.$store.state.Video.videoPath
      }
    },
    onMounted () {
      let win = new BrowserWindow({webPreferences: {webSecurity: false}})
      this.win = win

    // console.log('BrowserWindow.height', win.height)
    }
  }
</script>