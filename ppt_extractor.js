let fileBlob = null;  // 파일 데이터를 저장할 변수

// DOM 요소 참조
const fileInput = document.getElementById('excel-file');
const uploadButton = document.querySelector('button[type="submit"]');
const loadingSection = document.getElementById('loading-section');
const sheetListSection = document.getElementById('sheet-list-section');
const splitSettingsForm = document.getElementById('split-settings-form');
const splitButton = document.getElementById('split-button');
const splittingLoadingSection = document.getElementById('splitting-loading-section');
const downloadSection = document.getElementById('download-section');
const downloadLink = document.getElementById('download-link');
const dropZone = document.getElementById('drop-zone');

const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const slideSize = document.getElementById('slide-size');
const fileDescription = document.getElementById('file-description');


// 처음 로드 시 업로드 버튼 비활성화
uploadButton.disabled = true;
uploadButton.classList.add('hidden');
downloadSection.classList.add('hidden');

let slideCount = 0;


dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if(fileValidation(files)){
        fileInput.files = files;
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);  // change 이벤트 호출
    }
    dropZone.classList.remove('dragover');
});

// 클릭으로 파일 선택하기
dropZone.addEventListener('click', () => {
    fileInput.click();
});

// 파일 선택 시 업로드 버튼 활성화
fileInput.addEventListener('change', function() {
    const files = fileInput.files;
    if(fileValidation(files)){
        uploadButton.disabled = false;
        uploadButton.classList.remove('hidden');
        downloadSection.classList.add('hidden');
        displayFileInfo(files[0]);
    } else{
        uploadButton.classList.add('hidden');
        uploadButton.disabled = true;
    }
});

function fileValidation(files){
    if (files.length === 0) {
        return false;
    } 
    if (files.length !== 1) {
        alert("하나의 파일만 업로드 할 수 있습니다.");
        return false;
    } 
    if(!files[0].name.endsWith(".pptx")){
        alert("PPT파일(pptx 확장자)만 업로드 할 수 있습니다.");
        return false;
    }
    return true
}

// 파일 정보 표시 함수
function displayFileInfo(file) {
    fileDescription.style.display = 'none';
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2); // 파일 크기를 MB로 변환
    fileName.textContent = `파일명: ${file.name}`;
    fileSize.textContent = `파일 크기: ${sizeInMB} MB`;
    fileInfo.style.display = 'flex';
}


// 파일 읽기 폼 제출 시 동작
document.getElementById('excel-upload-form').addEventListener('submit', function(e) {
    clearPreviousSettings();
    e.preventDefault();
    downloadSection.classList.add('hidden');
    // 로딩 애니메이션 표시
    loadingSection.classList.remove('hidden');
    uploadButton.disabled = true;

    const fileInput = document.getElementById('excel-file');
    const file = fileInput.files[0];  // 파일 참조

    if (!file) {
        alert('파일을 선택해주세요.');
        loadingSection.classList.add('hidden');
        uploadButton.disabled = false;
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;

        JSZip.loadAsync(arrayBuffer).then(function(zip) {
            // PPT 파일 구조에서 슬라이드는 ppt/slides/ 폴더 안에 저장됨
            const slideFiles = Object.keys(zip.files).filter(function(fileName) {
                return fileName.startsWith("ppt/slides/slide");
            });

            slideCount = slideFiles.length;
            addForm();
            slideSize.classList.remove('hidden');
            slideSize.textContent = `총 슬라이드 : ${slideCount}장`;
            loadingSection.classList.add('hidden');

            sheetListSection.classList.remove('hidden');
            splitButton.classList.remove('hidden');
            
            uploadButton.disabled = false;
        }).catch(function(error) {
            alert("PPT 파일을 처리하는 중 오류가 발생했습니다.");
            loadingSection.classList.add('hidden');
            uploadButton.disabled = false;
        });
    };

    reader.readAsArrayBuffer(file);
});



// 쪼개기 버튼 클릭 시
splitButton.addEventListener('click', function() {
    const formData = getFormData();

    if (!formData) return;
    console.log(formData);

    // 로딩 애니메이션 (쪼개기 작업 중) 표시
    sheetListSection.classList.add('hidden');
    splitButton.classList.add('hidden');
    splittingLoadingSection.classList.remove('hidden');

    // 서버에 POST 요청
    fetch('/ppt-extract', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('서버와의 연결이 원활하지 않습니다.');
        }
        return response.blob();  // 파일 데이터를 Blob으로 변환
    })
    .then(blob => {
        fileBlob = blob;  // 받아온 파일 데이터를 전역 변수에 저장
        const url = window.URL.createObjectURL(fileBlob);
        downloadLink.href = url;
        downloadLink.download = "쪼개진.pptx"

        splittingLoadingSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('PPT 분리 중 오류가 발생했습니다.');
        splittingLoadingSection.classList.add('hidden');
    });
});

function addForm() {    
    const div = document.createElement('div');
    div.classList.add('sheet-setting');
    div.innerHTML = `
        <div id="setting">
            <label for="slide-number">유지할 슬라이드 번호<br>(쉼표 구분)</label>
            <input type="text" id="slide-number" name="slide-number" style="width:150px;">
        </div>
        <div id="setting">
            <label for="slide-keyword">추출 단어</label>
            <input type="text" id="slide-keyword" name="slide-keyword" value="" style="width:150px;">
        </div>
        <div id="setting">
            <label class="toggle-label" style="width:300px;">
                <span class="toggle-description" style = "width:140px;">대소문자 구분</span> 
                <input type="checkbox" id="case-sensitive-toggle" name="case-sensitive">
                <span class="slider"></span>
            </label>
        </div>
    `;

    splitSettingsForm.appendChild(div);
}


function getFormData() {
    const formData = new FormData(splitSettingsForm);
    const exceptSlideNumber = document.getElementById("slide-number");
    const capitalYn = document.getElementById("case-sensitive-toggle");
    const keyword = document.getElementById("slide-keyword");

    const slideNumList = exceptSlideNumber.value.split(",")
    let slideTrimNumList = [];
    for(let i = 0; i < slideNumList.length ; i++){
        let slideNo = slideNumList[i].trim();
        if (slideNo > slideCount) {
            alert("전체 슬라이드 수는 "+slideCount+"입니다. 제외 슬라이드를 다시 설정해주세요.");
            return false;
        }
        slideTrimNumList.push(slideNo);
    }

    formData.append('exceptSlideNumber', slideTrimNumList);
    formData.append('keyword', keyword.value);
    formData.append('capitalYn', capitalYn.value);

    const file = fileInput.files[0];
    formData.append('file', file);  // 'file'은 서버에서 받을 필드명

    return formData;
}

function clearPreviousSettings() {
    while (splitSettingsForm.firstChild) {
        splitSettingsForm.removeChild(splitSettingsForm.firstChild);
    }
}