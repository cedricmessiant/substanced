/*jslint unparam: true, regexp: true */
/*global window, jQuery */

+(function($) {
    'use strict';

    function flash(alertType, diff) {
        // Alert type is either 'success' or 'error'.
        // Diff is a positive value.
        //
        // is there already a flash for this alert type?
        var flashBox = $('#messages').find('.alert-fileupload-' + alertType).last();
        if (flashBox.length === 0) {
            // If not, create it.
            flashBox = $('<div class="alert alert-' + alertType +
                      ' alert-fileupload-' + alertType + '"></div>')
                .append('<span class="status"></span>')
                .append('<button type="button" class="close" data-dismiss="alert">&times;</button>')
                .data({
                    nr: 0,
                    increment: function(diff) {
                        this.nr += diff;
                        flashBox.find('.status').text(
                            ((this.nr < 2) ? {
                                // singular
                                success: '' + this.nr + ' file uploaded',
                                danger: 'Upload failed for ' + this.nr + ' file'
                            } : {
                                // plural
                                success: '' + this.nr + ' files uploaded',
                                danger: 'Upload failed for ' + this.nr + ' files'
                            })[alertType]
                        );
                    }
                })
                .appendTo('#messages');
        }
        // Increment the counter with the diff specified.
        flashBox.data().increment(diff);
    }

    var url = './@@upload-submit',
        UploadButton = $('<button class="upload-button" />')
            .addClass('btn btn-primary')
            .prop('disabled', true)
            .on('click', function () {
                var data = $(this).data();
                data.uploadState();
                data.self.on('click', function () {
                    data.finishedState();
                    data.abort();
                });
                data.submit().always(function () {
                    data.finishedState();
                });
            })
            .data({
                create: function() {
                    // create and return a new button
                    var self = UploadButton.clone(true);
                    var data = self.data();
                    data.self = self;
                    // set initial state
                    data.initialState();
                    // and return it
                    return self;
                },
                initialState: function() {
                    this.self
                        .text('Upload')
                        .prop('disabled', !!(this.files || []).error);
                    this.handlers = {};
                    this.handlers.submit = [];
                    this.handlers.abort = [];
                },
                uploadState: function() {
                    this.self
                        .off('click')
                        .text('Abort');
                    // add a promise for us
                    // to signal when finished
                    this.finished = $.Deferred();
                },
                finishedState: function() {
                    this.self.remove();
                    this.finished.resolve();
                },
                onSubmit: function(handler) {
                    this.handlers.submit.push(handler);
                },
                submit: function() {
                    // submit all sets of files
                    var all = [];
                    this.handlers.abort = [];
                    $.each(this.handlers.submit, function (index, handler) {
                        all.push(handler());
                    });
                    // make an 'all' promise from the individual promises
                    return $.when.apply(null, all);
                },
                abort: function() {
                    $.each(this.handlers.abort, function (index, handler) {
                        handler();
                    });
                    this.handlers.abort = [];
                }
            });
    $('#fileupload').fileupload({
        url: url,
        dataType: 'json',
        autoUpload: false,
        // XXX These settings do not make sense generically,
        // but they can be important in specific use cases.
        // For this reason, they should be settable on the folder.
        // TODO implement this once.
        //
        //acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
        //maxFileSize: 5000000, // 5 MB
        //
        // Enable image resizing, except for Android and Opera,
        // which actually support image resizing, but fail to
        // send Blob objects via XHR requests.
        // By default images are resized to FullHD (1920x1080).
        disableImageResize: /Android(?!.*Chrome)|Opera/
            .test(window.navigator.userAgent),
        previewMaxWidth: 100,
        previewMaxHeight: 100,
        previewCrop: true,
        // enable multi file uploads, while limiting it with
        // a size (exceeding this a new request will be made)
        singleFileUploads: false,
        limitMultiFileUploadSize: 5 * 1000 * 1000    // 5MB
    }).on('fileuploadadd', function (e, data) {
        data.context = $('<div/>').appendTo('#files');
        // add a global upload button, if it does not exist yet
        var button = $('#fileupload-wrapper').find('.upload-button');
        if (button.length === 0) {
            button = UploadButton.data().create()
                .appendTo('#fileupload-wrapper');
        }
        // Construct the upload info bar for all the files
        $.each(data.files, function (index, file) {
            $('<div class="file-in-progress well"/>')
                .append($('<span/>').text(file.name))
                .append('<br>')
                .appendTo(data.context);
        });
        // register the submit function on the button
        button.data().onSubmit($.proxy(data.submit, data));
        // reset progress
        $('#progress .progress-bar').css('width', 0);
    }).on('fileuploadprocessalways', function (e, data) {
        var index = data.index,
            file = data.files[index],
            node = $(data.context.children()[index]);
        if (file.preview) {
            node
                .prepend('<br>')
                .prepend(file.preview);
        }
        if (file.error) {
            node
                .append('<br>')
                .append($('<span class="text-danger"/>').text(file.error));
        }
        //if (index + 1 === data.files.length) {
        //    // XXX
        //    data.context.find('button')
        //        .text('Upload')
        //        .prop('disabled', !!data.files.error);
        //}
    }).on('fileuploadprogressall', function (e, data) {
        var progress = parseInt(data.loaded / data.total * 100, 10);
        $('#progress .progress-bar').css('width', progress + '%');
    }).on('fileuploaddone', function (e, data) {
        // status for the user
        flash('success', data.result.files.length);
    }).on('fileuploadfail', function (e, data) {
        // status for the user
        flash('danger', data.files.length);
        //$.each(data.result.files, function (index, file) {
        //    console.log('ERROR file:', index, file);
        //});
    }).prop('disabled', !$.support.fileInput)
        .parent().addClass($.support.fileInput ? undefined : 'disabled');
})(jQuery);