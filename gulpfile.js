const gulp = require('gulp');
const fs = require('fs');

const ICON_DEST = 'dist/credentials/icons';

// Create a directory if it doesn't exist
const createDir = (dir) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
};

// Copy icons from credentials and nodes folders
gulp.task('build:icons', (done) => {
	createDir(ICON_DEST);
	// Copy credential icon
	gulp.src('credentials/*.svg').pipe(gulp.dest(ICON_DEST));

	// Copy node icons
	// Adjust the path if your node icons are located elsewhere
	gulp.src('nodes/**/*.svg').pipe(gulp.dest('dist/nodes'));
	done();
});

// Default task
gulp.task('default', gulp.series('build:icons'));
