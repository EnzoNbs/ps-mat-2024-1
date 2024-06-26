import { Checkbox, FormControlLabel } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import React from 'react';
import InputMask from 'react-input-mask';
import { useNavigate, useParams } from 'react-router-dom';
import { ZodError } from 'zod';
import myfetch from '../../lib/myfetch';
import Car from '../../models/Car';
import useConfirmDialog from '../../ui/useConfirmDialog';
import useNotification from '../../ui/useNotification';
import useWaiting from '../../ui/useWaiting';

export default function CarForm() {

  const formDefaults = {
    brand: '',
    model: '',
    color: '',
    year_manufacture: '',
    imported: false,
    plates: '',
    selling_date: null,
    selling_price: '',
  };

  const [state, setState] = React.useState({
    car: { ...formDefaults },
    formModified: false,
    inputErrors: {},
  });
  const { car, formModified, inputErrors } = state;

  const params = useParams();
  const navigate = useNavigate();

  const { askForConfirmation, ConfirmDialog } = useConfirmDialog();
  const { notify, Notification } = useNotification();
  const { showWaiting, Waiting } = useWaiting();

  const colors = [
    { value: 'Branco', label: 'Branco' },
    { value: 'Prata', label: 'Prata' },
    { value: 'Preto', label: 'Preto' },
    { value: 'Vermelho', label: 'Vermelho' },
    { value: 'Amarelo', label: 'Amarelo' },
    { value: 'Azul', label: 'Azul' },
  ];

  const plateMaskFormatChars = {
    9: '[0-9]', 
    $: '[0-9A-J]', 
    A: '[A-Z]', 
  };

  const currentYear = new Date().getFullYear();
  const minYear = 1960;
  const years = [];
  for (let year = currentYear; year >= minYear; year--) {
    years.push(year);
  }

  const [imported, setImported] = React.useState(false);
  const handleImportedChange = (event) => {
    setImported(event.target.checked);
  };

  function handleFieldChange(event) {
    const carCopy = { ...car };
    carCopy[event.target.name] = event.target.value;
    setState({ ...state, car: carCopy, formModified: true });
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    showWaiting(true); 
    try {
      Car.parse(car);
      console.log(car);

      if (params.id) await myfetch.put(`/cars/${params.id}`, car);

      else await myfetch.post('/cars', car);

      notify('Item salvo com sucesso.', 'success', 4000, () => {
        navigate('..', { relative: 'path', replace: true });
      });
    } catch (error) {

      if (error instanceof ZodError) {
        const messages = {};

        for (let i of error.issues) messages[i.path[0]] = i.message;
        setState({ ...state, inputErrors: messages });

        notify('Há campos com valores inválidos no formulário', 'error');
      } else notify(error.message, 'error');
    } finally {
  
      showWaiting(false);
    }
  }

  React.useEffect(() => {
    if (params.id) loadData();
  }, []);

  async function loadData() {
    showWaiting(true);
    try {
      const result = await myfetch.get(`/cars/${params.id}`);

      result.selling_date = parseISO(result.selling_date);

      setState({ ...state, customer: result });
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    } finally {
      showWaiting(false);
    }
  }

  async function handleBackButtonClick() {
    if (
      formModified &&
      !(await askForConfirmation(
        'Há informações não salvas. Deseja realmente sair?'
      ))
    )
      return;

    navigate('..', { relative: 'path', replace: true });
  }

  return (
    <>
      <ConfirmDialog />
      <Notification />
      <Waiting />

      <Typography variant='h1' gutterBottom>
        {params.id ? `Editar carro #${params.id}` : 'Cadastrar novo carro'}
      </Typography>

      <Box className='form-fields'>
        <form onSubmit={handleFormSubmit}>
          <TextField
            name='brand'
            label='Marca do carro'
            variant='filled'
            required
            fullWidth
            value={car.brand}
            onChange={handleFieldChange}
            helperText={inputErrors?.brand}
            error={inputErrors?.brand}
          />
          <TextField
            name='model'
            label='Modelo do carro'
            variant='filled'
            required
            fullWidth
            value={car.model}
            onChange={handleFieldChange}
            helperText={inputErrors?.model}
            error={inputErrors?.model}
          />

          <TextField
            name='color'
            label='Color'
            variant='filled'
            required
            fullWidth
            value={car.color}
            onChange={handleFieldChange}
            select
            helperText={inputErrors?.state}
            error={inputErrors?.state}
          >
            {colors.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            name='year_manufacture'
            label='Ano de fabricação'
            variant='filled'
            required
            fullWidth
            select
            value={car.year_manufacture}
            onChange={handleFieldChange}
            helperText={inputErrors?.year_manufacture}
            error={inputErrors?.year_manufacture}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={
              <Checkbox
                name='imported'
                variant='filled'
                value={(car.imported = imported)}
                checked={imported}
                onChange={handleImportedChange}
                color='primary'
              />
            }
            label='Importado'
          />

          <InputMask
            mask='AAA-9$99'
            formatChars={plateMaskFormatChars}
            maskChar=' '
            value={car.plates}
            onChange={handleFieldChange}
          >
            {() => (
              <TextField
                name='plates'
                label='Placa'
                variant='filled'
                required
                fullWidth
                helperText={inputErrors?.phone}
                error={inputErrors?.phone}
              />
            )}
          </InputMask>

          <LocalizationProvider
            dateAdapter={AdapterDateFns}
            adapterLocale={ptBR}
          >
            <DatePicker
              label='Data de venda'
              value={car.selling_date}
              onChange={(value) =>
                handleFieldChange({
                  target: { name: 'selling_date', value },
                })
              }
              slotProps={{
                textField: {
                  variant: 'filled',
                  fullWidth: true,
                  helperText: inputErrors?.selling_date,
                  error: inputErrors?.selling_date,
                },
              }}
            />
          </LocalizationProvider>

          <TextField
            name='selling_price'
            label='Preço de venda'
            variant='filled'
            type='number'
            required
            fullWidth
            value={car.selling_price}
            onChange={handleFieldChange}
            helperText={inputErrors?.selling_price}
            error={inputErrors?.selling_price}
          />

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              width: '100%',
            }}
          >
            <Button variant='contained' color='secondary' type='submit'>
              Salvar
            </Button>
            <Button variant='outlined' onClick={handleBackButtonClick}>
              Voltar
            </Button>
          </Box>

        </form>
      </Box>
    </>
  );
}