import { Page } from 'puppeteer';

/**
 *
 * @param {Page} page
 * @param {String} selector
 * @returns
 */
async function getPageValue(page, selector) {
  return await page.evaluate(
    (selector) => selector.textContent.trim(),
    await page.waitForSelector(selector),
  );
}

/**
 *
 * @param {object} params
 * @param {Page} params.page
 */
export async function login({ page, user, password }) {
  await page.goto('https://siga.cps.sp.gov.br/aluno/login.aspx');

  await page.waitForSelector('#vSIS_USUARIOID');
  await page.waitForSelector('#vSIS_USUARIOSENHA');

  const submitForm = new Promise((resolve) => {
    setTimeout(async () => {
      await page.type('#vSIS_USUARIOID', user);
      await page.type('#vSIS_USUARIOSENHA', password);
      await page.waitForSelector('[name=BTCONFIRMA]');
      await page.click('[name=BTCONFIRMA]');
      resolve();
    }, 300);
  });

  await submitForm;

  const hasErrors = new Promise((resolve) => {
    setTimeout(async () => {
      const formError = await page.url().includes('login.aspx');
      if (formError) return resolve(new Error('Usuário ou senha inválidos.'));
      resolve();
    }, 400);
  });

  const errorMessage = await hasErrors;

  if (errorMessage instanceof Error) throw errorMessage;
}

/**
 *
 * @param {object} params
 * @param {Page} params.page
 */
export async function getUser({ page }) {
  const searchMap = {
    name: '#span_MPW0041vPRO_PESSOALNOME',
    RA: '#span_MPW0041vACD_ALUNOCURSOREGISTROACADEMICOCURSO',
    semester: '#span_MPW0041vACD_ALUNOCURSOCICLOATUAL',
    email: '#span_MPW0041vINSTITUCIONALFATEC',
    image: '#MPW0041FOTO > img',
  };

  const imageElement = await page.waitForSelector(searchMap.image);
  const image = await imageElement.evaluate((el) => el.src);

  return {
    RA: await getPageValue(page, searchMap.RA),
    name: await getPageValue(page, searchMap.name),
    semester: Number(await getPageValue(page, searchMap.semester)),
    email: await getPageValue(page, searchMap.email),
    image,
  };
}

/**
 *
 * @param {object} params
 * @param {Page} params.page
 */
export async function getAttendanceState({ page }) {
  const TABLE_SELECTOR = '#Grid1ContainerTbl > tbody';

  await page.goto('https://siga.cps.sp.gov.br/aluno/faltasparciais.aspx');

  const tableData = await page.waitForSelector(TABLE_SELECTOR);
  const rows = await tableData.$$('.GridClearOdd');

  const missingClasses = [];

  for (let i = 1; i < rows.length; i++) {
    const columns = await rows[i].$$('td');

    if (columns.length === 0) continue;

    const infoRows = await columns[4].$$('tr');
    const info = [];

    for (let j = 1; j < infoRows.length; j++) {
      const infoColumns = await infoRows[j].$$('td');

      const infoData = {
        date: await infoColumns[0].evaluate((el) => el.textContent.trim()),
        subject: await infoColumns[1].evaluate((el) => el.textContent.trim()),
        attendance: Number(
          await infoColumns[2].evaluate((el) => el.textContent.trim()),
        ),
        absences: Number(
          await infoColumns[3].evaluate((el) => el.textContent.trim()),
        ),
      };

      info.push(infoData);
    }

    const classData = {
      id: await columns[0].evaluate((el) => el.textContent.trim()),
      subject: await columns[1].evaluate((el) => el.textContent.trim()),
      attendance: Number(
        await columns[2].evaluate((el) => el.textContent.trim()),
      ),
      absences: Number(
        await columns[3].evaluate((el) => el.textContent.trim()),
      ),
      info,
    };

    missingClasses.push(classData);
  }

  return missingClasses;
}

/**
 *
 * @param {object} params
 * @param {Page} params.page
 */
export async function getGrades({ page }) {
  const TABLE_SELECTOR = '#Grid4ContainerTbl > tbody';
  await page.goto('https://siga.cps.sp.gov.br/aluno/notasparciais.aspx');

  const tableData = await page.waitForSelector(TABLE_SELECTOR);
  const rows = await tableData.$$('tr');

  const entries = [[]];

  // get all rows and split them into entries
  for (let i = 0; i < rows.length; i++) {
    const currentIndex = entries.length - 1;
    const content = await rows[i].evaluate((el) => el.innerText);

    if (content === '' && i !== rows.length - 1) {
      entries.push([]);
      continue;
    }

    entries[currentIndex].push(content);
  }

  // format as object
  const formattedEntries = entries.map((entry) => {
    const id = entry[0].split('\t')[0];
    const subject = entry[0].split('\t')[1]?.split('\n')[0]
    const averageGrade = Number(entry[1]?.split('\t')) || 0;
    const attendance = Number(entry[2]?.split('\t')) || 0;
    const frequency = Number(entry[3]?.split('\t')) || 0;

    // rest of array are the grades
    const grades = entry.slice(7).map((grade) => {
      const [id, date, entryGrade] = grade.split('\t');

      return {
        id,
        date: date || null,
        grade: Number(entryGrade?.replace(',', '.')) || 0,
      };
    });

    return {
      id,
      subject,
      averageGrade,
      attendance,
      frequency,
      grades,
    };
  });

  return formattedEntries;
}
