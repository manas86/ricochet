//stream.js

var PLAYER = $('audio.player'),
    p = PLAYER.get(0),
    CONTROLS = $('.controls'),
    CONTROLS_PLAY = CONTROLS.find('.play'),
    CONTROLS_NEXT = CONTROLS.find('.next'),
    CONTROLS_PREV = CONTROLS.find('.prev'),
    CONTROLS_VOLUME = CONTROLS.find('.volume'),
    VOLUME_BAR = CONTROLS.find('.volumebar'),
    VOLUME_HANDLE = CONTROLS.find('.volumehandle'),
    PROGRESS = $('.progress'),
    NOW_PLAYING = $('.now-playing'),
    DURATION = $('.controls .duration'),
    REINDEX = $('#reindex'),
    ALERT_SUCCESS = $('#global-success'),
    ALERT_ERROR = $('#global-error'),
    playing = null,
    changing_volume = false,
    position = 0;

$('.library .track').click(function() {
    playTrack($(this));
});

function playTrack(obj) {
    // If the object is empty
    if (obj.length == 0) {
        stopPlayback();
        return;
    }

    // Configure the audio tag
    PLAYER.attr('src', '/play/' + obj.data('track_id'));
    PLAYER.trigger('play');

    // Set the global playing track
    playing = obj;
    setControlsInfo(obj);
}
function getNextTrack() {
    var next = $(playing).next();
    return next;
}
function getPrevTrack() {
    var prev = $(playing).prev();
    return prev;
}
function stopPlayback() {
    playing = null;

    // Actually stop the audio tag
    PLAYER.trigger('pause');
    PLAYER.attr('src', '');
    setControlsInfo(null);

    // Clear the now playing bar
    //NOW_PLAYING.fadeOut(500);

    // Clear the now playing row
    $('.library tr.info').removeClass('info');
}
function setVolume(perc) {
    // Set volume on audio element
    p.volume = perc;

    // Set volume icon
    CONTROLS_VOLUME.removeClass('fa-volume-down')
                   .removeClass('fa-volume-up')
                   .removeClass('fa-volume-off');
    if (perc > .65) {
        CONTROLS_VOLUME.addClass('fa-volume-up');
    } else if (perc > .05) {
        CONTROLS_VOLUME.addClass('fa-volume-down');
    } else {
        CONTROLS_VOLUME.addClass('fa-volume-off');
    }
}
setVolume(1);

function doTrackAction(obj, action) {
    if (obj.length == 0) {
        return;
    }

    var url = '/play/' + obj.data('track_id') + '/' + action;

    // Perform the action and replace the row with a new render
    $.post(url, function(data) {
        obj.html($(data).html());
    });
}

// every 250ms, update the progress bar and duration clock
var progressInterval = setInterval(function() {
    var bar = PROGRESS,
        cur = p.currentTime,
        dur = p.duration,
        playing = !p.paused,
        width = 0,
        screenWidth = 100;

    width = cur/dur * screenWidth;
    bar.animate({
        'width': width + '%',
    }, 100);

    var displayTime = formatSeconds(cur),
        clock = DURATION;
    clock.html(displayTime);

}, 250);

// Audio Player Events
PLAYER.on('ended', function() {
    // Increment play count for finished track
    doTrackAction(playing, 'increment');

    playTrack(getNextTrack());

    PROGRESS.css('width', '0%');
    CONTROLS.find('.play').removeClass('fa-pause').addClass('fa-play');
});
PLAYER.on('pause', function() {
    CONTROLS.find('.play').removeClass('fa-pause').addClass('fa-play');
});
PLAYER.on('play', function() {
    CONTROLS.find('.play').removeClass('fa-play').addClass('fa-pause');
});

// Control button events
CONTROLS_PLAY.click(function() {
    var p = PLAYER.get(0);
    if (p.paused == true) {
        p.play();
    } else {
        p.pause();
    }
});
CONTROLS_NEXT.click(function() {
    playTrack(getNextTrack());
});
CONTROLS_PREV.click(function() {
    if (p.currentTime < 5) {
        playTrack(getPrevTrack());
    } else {
        playTrack(playing);
    }
});
CONTROLS_VOLUME.click(function() {
    VOLUME_BAR.toggle(0, function() {
        VOLUME_BAR.css('position', 'absolute');
    });
});
VOLUME_BAR.hide();

// Volume bar events
VOLUME_HANDLE.on('mousedown', function() {
    changing_volume = true;
});
$('body').on('mouseup', function() {
    if (changing_volume) {
        changing_volume = false;
    }
});
VOLUME_BAR.on('mousemove', function(event) {
    if (!changing_volume) {
        return false;
    }

    var posY = event.pageY - 35,
        height = VOLUME_BAR.height() - 5,
        minY = VOLUME_BAR.offset().top - 5,
        maxY = minY + height;

    if (posY >= minY && posY <= maxY) {
        var offset = posY - minY,
            perc = 1 - offset/height;

        // Set position of handle
        VOLUME_HANDLE.css('margin-top', (offset - 5) + 'px');

        // Set volume of audio element
        setVolume(perc);
    }

    return false;
});

// Settings buttons
REINDEX.click(function() {
    $.post('/server/reindex', function(data) {
        if (data == 'OK') {
            alertSuccess("Reindexing started");
        } else {
            alertError("Reindexing failed");
        }
    }).fail(function() {
        alertError("Reindexing failed");
    });
});

// Keyboard events
Mousetrap.bind('space', function() {
    CONTROLS_PLAY.trigger('click');
    return false;
});

// places the track name into the floating control module
function setControlsInfo(obj) {
    if ($.isEmptyObject(obj)) {
        var track_title = "",
            track_artist = "";
    } else {
        var track_title = obj.find('.title').html(),
            track_artist = obj.find('.artist').html();
    }
    NOW_PLAYING.fadeOut(250, function() {
        $(this).find('.title').html(track_title);
        $(this).find('.artist').html(track_artist);
        $(this).fadeIn(250);
    });

    // Update the row color for the currently playing track
    $('.library tr.info').removeClass('info');

    if (!$.isEmptyObject(obj)) {
        obj.addClass('info');
    }
}

function formatSeconds(input) {
    var sec_num = parseInt(input, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (seconds < 10) { seconds = "0" + seconds; }

    if (hours == 0 ){
        return minutes + ':' + seconds;
    } else {
        return hours + ':' + minutes + ':' + seconds;
    }
}

function alertSuccess(message) {
    ALERT_SUCCESS.html(message).fadeIn().delay(2000).fadeOut();
}
function alertError(message) {
    ALERT_ERROR.html(message).fadeIn().delay(2000).fadeOut();
}
ALERT_SUCCESS.hide();
ALERT_ERROR.hide();
