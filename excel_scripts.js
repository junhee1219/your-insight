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
const fileDescription = document.getElementById('file-description');


// 처음 로드 시 업로드 버튼 비활성화
uploadButton.disabled = true;
uploadButton.classList.add('hidden');
downloadSection.classList.add('hidden');


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
    if(!files[0].name.endsWith(".xlsx") && !files[0].name.endsWith(".xls") ){
        alert("엑셀파일(xlsx, xls 확장자)만 업로드 할 수 있습니다.");
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
    e.preventDefault();
    downloadSection.classList.add('hidden');
    // 로딩 애니메이션 표시
    loadingSection.classList.remove('hidden');
    uploadButton.disabled = true;

    const fileInput = document.getElementById('excel-file');
    const file = fileInput.files[0];  // 파일 참조
    try {

        if (!file) {
            alert('파일을 선택해주세요.');
            loadingSection.classList.add('hidden');
            uploadButton.disabled = false;
            return;
        }

        const reader = new FileReader();

        // 파일 읽기 완료 시 동작
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 시트 이름 가져오기
            const sheetNames = workbook.SheetNames;
            console.log(sheetNames);
            clearPreviousSettings();

            // 각 시트의 데이터가 있는 컬럼(A, B, C...) 추출
            sheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const ref = XLSX.utils.decode_range(worksheet['!ref']);  // 시트의 전체 범위 가져오기
                const columns = [];
                
                // 데이터가 있는 컬럼을 추출 (알파벳 표기 A, B, C...)
                for (let col = ref.s.c; col <= ref.e.c; col++) {
                    const colName = XLSX.utils.encode_col(col);  // A, B, C 등 컬럼명 추출
                    columns.push(colName);  // 컬럼명 추가
                }

                // 동적으로 시트별 폼 추가
                addSheetSetting(sheetName, columns);
            });

            // 로딩 애니메이션 숨기기
            loadingSection.classList.add('hidden');
            
            // 시트 설정 폼과 쪼개기 버튼 표시
            sheetListSection.classList.remove('hidden');
            splitButton.classList.remove('hidden');
            uploadButton.disabled = false;
        };

        // 파일 읽기 시작
        reader.readAsArrayBuffer(file);
    } catch(error){
        alert("손상된 파일입니다.");
    }
});


// 쪼개기 버튼 클릭 시
splitButton.addEventListener('click', function() {
    const formData = getFormData();
    console.log(formData);

    // 로딩 애니메이션 (쪼개기 작업 중) 표시
    sheetListSection.classList.add('hidden');
    splitButton.classList.add('hidden');
    splittingLoadingSection.classList.remove('hidden');

    // 서버에 POST 요청
    fetch('/split-excel', {
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
        let downloadFileName;
        try {
            downloadFileName = fileName.textContent.split("파일명: ")[1].split(".")[0] + ".zip";  // 파일명만 추출
        } catch (error) {
            console.log(error);
        }
        downloadLink.href = url;
        splittingLoadingSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('파일 쪼개기 중 오류가 발생했습니다.');
        splittingLoadingSection.classList.add('hidden');
    });
});

function addSheetSetting(sheetName, columns) {    
    const div = document.createElement('div');
    div.classList.add('sheet-setting');
    div.innerHTML = `
        <div class="sheet-header">
            <h3>${sheetName}</h3>
            <label class="toggle-label">
                <span class="toggle-description">쪼개기</span> <!-- 토글 버튼 옆에 설명 추가 -->
                <input type="checkbox" id="toggle-${sheetName}" name = "toggle-${sheetName}" checked>
                <span class="slider"></span>
            </label>
        </div>
        <div id="setting-${sheetName}">
            <label for="criteria-${sheetName}">기준 컬럼:</label>
            <select id="criteria-${sheetName}" name = "select-${sheetName}">
                ${columns.map(col => `<option value="${col}">${col}</option>`).join('')}
            </select>
            <label for="start-row-${sheetName}">시작 행:</label>
            <input type="number" id="start-row-${sheetName}" name = "start-${sheetName}" value="1" min="1">
        </div>
    `;

    document.getElementById('split-settings-form').appendChild(div);

    // 토글 스위치가 변경되면 컬럼 선택과 시작 행이 활성화/비활성화 됨
    const toggle = document.getElementById(`toggle-${sheetName}`);
    const settingsDiv = document.getElementById(`setting-${sheetName}`);

    toggle.addEventListener('change', function() {
        if (this.checked) {
            // 쪼개기 대상일 경우 활성화
            settingsDiv.querySelector('select').disabled = false;
            settingsDiv.querySelector('input[type="number"]').disabled = false;
        } else {
            // 쪼개기 대상이 아닐 경우 비활성화
            settingsDiv.querySelector('select').disabled = true;
            settingsDiv.querySelector('input[type="number"]').disabled = true;
        }
    });
}


function clearPreviousSettings() {
    // 기존 설정을 모두 제거
    const settingsForm = document.getElementById('split-settings-form');
    while (settingsForm.firstChild) {
        settingsForm.removeChild(settingsForm.firstChild);
    }
}

function getFormData() {
    const form = document.getElementById('split-settings-form');
    const formData = new FormData(form);

    const file = fileInput.files[0];
    formData.append('file', file);  // 'file'은 서버에서 받을 필드명
    
    const sheetSettings = [];  // 최종적으로 서버에 보낼 리스트

    // 모든 시트 설정 폼 데이터를 가져오기
    document.querySelectorAll('.sheet-setting').forEach(div => {
        const sheetName = div.querySelector('h3').innerText;  // 시트 이름
        const splitToggle = formData.get(`toggle-${sheetName}`) ? 1 : 0;  // 쪼개기 여부 (체크박스)
        const criteriaColumn = formData.get(`select-${sheetName}`);  // 기준 컬럼
        const startRow = formData.get(`start-${sheetName}`);  // 시작 행

        // 시트별 객체를 생성하여 배열에 추가
        const sheetSetting = {
            sheetName: sheetName,
            startRow: parseInt(startRow, 10),  // 숫자로 변환
            criteriaColumn: criteriaColumn,
            split: splitToggle
        };

        sheetSettings.push(sheetSetting);
    });
    formData.append('sheets', JSON.stringify(sheetSettings));
    return formData;
}

